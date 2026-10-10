"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  AgendaEvent,
  PersonalAgenda,
  WorkspaceRole,
} from "@esapiens/contracts";
import { isRecord } from "@/shared/api/public-api";
import { PortalUnavailable } from "./portal-ui";
import { ReminderForm, ReminderToggle } from "./agenda-forms";
import { AgendaCalendar } from "./agenda-calendar";

function validEvent(e: unknown): e is AgendaEvent {
  return (
    isRecord(e) &&
    typeof e.id === "string" &&
    typeof e.title === "string" &&
    typeof e.day === "string" &&
    /^20\d{2}-\d{2}-\d{2}$/.test(e.day) &&
    Number.isFinite(Date.parse(`${e.day}T12:00:00Z`)) &&
    ["recordatorio", "tarea", "clase"].includes(String(e.kind)) &&
    typeof e.done === "boolean" &&
    (e.courseId === null || typeof e.courseId === "string") &&
    (e.course === null || typeof e.course === "string") &&
    (e.occursAt === null ||
      (typeof e.occursAt === "string" &&
        Number.isFinite(Date.parse(e.occursAt))))
  );
}

function valid(v: unknown): v is PersonalAgenda {
  return (
    isRecord(v) &&
    typeof v.total === "number" &&
    Array.isArray(v.days) &&
    v.days.every(
      (d) =>
        isRecord(d) && typeof d.day === "string" && typeof d.count === "number",
    ) &&
    Array.isArray(v.events) &&
    v.events.every(validEvent) &&
    Array.isArray(v.upcoming) &&
    v.upcoming.every(validEvent)
  );
}

function EventDetails({
  event,
  role,
  timeZone,
  onSaved,
}: {
  event: AgendaEvent;
  role: WorkspaceRole;
  timeZone: string;
  onSaved: () => void;
}) {
  return (
    <>
      <p className="text-xs font-semibold text-brand">
        {event.kind === "tarea"
          ? "Plazo de tarea"
          : event.kind === "clase"
            ? "Clase programada"
            : "Mi recordatorio"}
        {event.done
          ? event.kind === "tarea"
            ? " · Entregada"
            : " · Completado"
          : ""}
      </p>
      <h3
        className={`mt-1 break-words font-medium ${event.done ? "text-muted line-through" : ""}`}
      >
        {event.title}
      </h3>
      {event.course && (
        <p className="mt-1 text-xs text-muted">{event.course}</p>
      )}
      {event.occursAt && (
        <time
          dateTime={event.occursAt}
          className="mt-1 block text-xs text-muted"
        >
          {new Intl.DateTimeFormat("es-BO", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone,
          }).format(new Date(event.occursAt))}
        </time>
      )}
      {event.kind === "recordatorio" ? (
        <ReminderToggle
          id={event.id}
          done={event.done}
          role={role}
          onSaved={onSaved}
        />
      ) : event.kind === "tarea" && event.courseId ? (
        <Link
          href={`/portal/${role}/cursos/${event.courseId}/tareas/${event.id}`}
          className="text-link mt-2 inline-flex min-h-11 items-center text-sm"
        >
          {role === "estudiante" ? "Abrir tarea →" : "Consultar tarea →"}
        </Link>
      ) : null}
    </>
  );
}

export function PortalAgenda({
  role,
  compact = false,
  timeZone,
  month: initialMonth,
  day: initialDay,
}: {
  role: WorkspaceRole;
  compact?: boolean;
  timeZone: string;
  month?: string;
  day?: string;
}) {
  const [selection, setSelection] = useState({
    month: initialMonth,
    day: initialDay,
  });
  const { month: requestedMonth, day: requestedDay } = selection;
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision((value) => value + 1);
  const [snapshot, setSnapshot] = useState<{
    key: string;
    data?: PersonalAgenda;
  } | null>(null);
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const today = ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join("-");
  const month =
    typeof requestedMonth === "string" &&
    /^20\d{2}-(0[1-9]|1[0-2])$/.test(requestedMonth)
      ? requestedMonth
      : today.slice(0, 7);
  const start = new Date(`${month}-01T12:00:00Z`);
  const days = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const day =
    typeof requestedDay === "string" &&
    requestedDay.startsWith(`${month}-`) &&
    /^20\d{2}-\d{2}-\d{2}$/.test(requestedDay) &&
    Number(requestedDay.slice(-2)) >= 1 &&
    Number(requestedDay.slice(-2)) <= days
      ? requestedDay
      : today.startsWith(month)
        ? today
        : `${month}-01`;
  const query = new URLSearchParams({ month, day, role }).toString();
  const requestKey = `${query}:${revision}`;
  const pending = snapshot?.key !== requestKey;
  const result: { data?: PersonalAgenda } = pending ? {} : (snapshot ?? {});
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/academic/agenda?${query}`, {
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(10000),
          ]),
        });
        const value: unknown = await response.json();
        if (!response.ok || !valid(value)) throw new Error();
        if (!controller.signal.aborted)
          setSnapshot({ key: requestKey, data: value });
      } catch {
        if (!controller.signal.aborted) setSnapshot({ key: requestKey });
      }
    }
    void load();
    return () => controller.abort();
  }, [query, requestKey]);
  const activityCounts = new Map<string, number>(
    result.data?.days.map(({ day, count }) => [day, count]),
  );
  const shift = (n: number) => {
    const d = new Date(start);
    d.setUTCMonth(d.getUTCMonth() + n);
    return d.toISOString().slice(0, 7);
  };
  const heading = new Intl.DateTimeFormat("es-BO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(start);
  return (
    <div
      className={
        compact
          ? "w-full min-w-0 space-y-4"
          : "grid items-start gap-6 xl:grid-cols-[1.3fr_1fr]"
      }
    >
      <section
        className={`ui-card min-w-0 overflow-hidden ${compact ? "p-4" : "p-5 sm:p-7"}`}
        aria-label="Calendario de actividades"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow">
            {compact ? "Mi calendario" : "Tu agenda de coordinación"}
          </p>
          <button
            type="button"
            onClick={() =>
              setSelection({ month: today.slice(0, 7), day: today })
            }
            className="text-link inline-flex min-h-11 items-center text-sm"
          >
            Hoy
          </button>
        </div>
        <AgendaCalendar
          month={month}
          heading={heading}
          previousMonth={month === "2000-01" ? null : shift(-1)}
          nextMonth={month === "2099-12" ? null : shift(1)}
          compact={compact}
          pending={pending}
          onMonthChange={(month) => setSelection({ month, day: undefined })}
        >
          <div className="grid grid-cols-7 text-center text-xs text-muted">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <span className="py-3" key={d}>
                {d}
              </span>
            ))}
          </div>
          <div
            className={`grid grid-cols-7 gap-1 ${compact ? "" : "sm:gap-2"}`}
          >
            {Array.from({ length: (start.getUTCDay() + 6) % 7 }, (_, i) => (
              <span key={`blank-${i}`} aria-hidden />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const date = `${month}-${String(i + 1).padStart(2, "0")}`;
              const count = activityCounts.get(date) ?? 0;
              return (
                <button
                  type="button"
                  key={date}
                  onClick={() => setSelection({ month, day: date })}
                  aria-current={date === day ? "date" : undefined}
                  aria-label={`${date}${count ? `, ${count} actividades` : ""}`}
                  className={`flex min-w-0 flex-col items-center justify-center rounded-xl border text-sm transition-colors ${compact ? "min-h-11" : "min-h-16 sm:min-h-20"} ${date === day ? "border-brand bg-brand text-on-brand" : date === today ? "border-brand bg-brand-soft" : "border-line hover:bg-brand-soft"}`}
                >
                  <strong>{i + 1}</strong>
                  {count > 0 && (
                    <span className="mt-1 text-[10px]">
                      {compact ? (
                        "●"
                      ) : (
                        <>
                          {count}{" "}
                          <span className="hidden sm:inline">activ.</span>
                        </>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </AgendaCalendar>
        <p className="mt-5 text-xs leading-6 text-muted">
          Fechas de clases, plazos de tareas publicadas y tus recordatorios
          personales. Zona horaria: {timeZone}.
        </p>
        {result.data && (
          <div className="mt-5 border-t border-line pt-5">
            <h2 className="font-semibold">Próximos pendientes</h2>
            <p className="mt-1 text-xs text-muted">
              Tareas y recordatorios por completar. Hasta 8 avisos de los
              próximos 30 días.
            </p>
            {result.data.upcoming.length ? (
              <ul className="mt-3 max-h-80 space-y-3 overflow-y-auto overscroll-contain p-1">
                {result.data.upcoming.map((event) => (
                  <li
                    key={`${event.kind}-${event.id}`}
                    className="rounded-xl border border-line p-3"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSelection({
                          month: event.day.slice(0, 7),
                          day: event.day,
                        })
                      }
                      className="text-link mb-2 inline-flex min-h-11 items-center text-xs"
                    >
                      {event.day === today
                        ? "Hoy"
                        : new Intl.DateTimeFormat("es-BO", {
                            dateStyle: "medium",
                            timeZone: "UTC",
                          }).format(new Date(`${event.day}T12:00:00Z`))}{" "}
                      · Ver día
                    </button>
                    <EventDetails
                      event={event}
                      role={role}
                      timeZone={timeZone}
                      onSaved={refresh}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">
                No tienes tareas ni recordatorios pendientes para los próximos
                30 días.
              </p>
            )}
          </div>
        )}
      </section>
      <section className={`ui-card min-w-0 ${compact ? "p-4" : "p-5 sm:p-6"}`}>
        <p className="eyebrow">El día que elegiste</p>
        <h2 className="mt-2 text-xl font-semibold">
          {new Intl.DateTimeFormat("es-BO", {
            dateStyle: "long",
            timeZone: "UTC",
          }).format(new Date(`${day}T12:00:00Z`))}
        </h2>
        {!result.data ? (
          pending ? (
            <p role="status" className="my-6 text-sm text-muted">
              Cargando agenda…
            </p>
          ) : (
            <>
              <PortalUnavailable />
              <button
                type="button"
                onClick={refresh}
                className="button button-secondary mt-3"
              >
                Reintentar
              </button>
            </>
          )
        ) : (
          <>
            {!result.data.events.length ? (
              <p className="my-6 text-sm text-muted">
                No hay actividades registradas para este día. Puedes reservarlo
                para planificar o añadir un recordatorio.
              </p>
            ) : (
              <ul className="mt-5 max-h-96 space-y-4 overflow-y-auto overscroll-contain p-1">
                {result.data.events.map((event) => (
                  <li
                    key={`${event.kind}-${event.id}`}
                    className="rounded-xl border border-line p-4"
                  >
                    <EventDetails
                      event={event}
                      role={role}
                      timeZone={timeZone}
                      onSaved={refresh}
                    />
                  </li>
                ))}
              </ul>
            )}
            {result.data.total > 100 && (
              <p className="mt-4 text-sm text-muted">
                Se muestran las primeras 100 de {result.data.total} actividades
                del día. Consulta cada materia para ver todos sus registros.
              </p>
            )}
          </>
        )}
        {result.data &&
          (compact ? (
            <details className="mt-4">
              <summary className="text-link cursor-pointer py-3 text-sm">
                Añadir recordatorio personal
              </summary>
              <ReminderForm key={day} day={day} role={role} onSaved={refresh} />
            </details>
          ) : (
            <ReminderForm key={day} day={day} role={role} onSaved={refresh} />
          ))}
      </section>
    </div>
  );
}

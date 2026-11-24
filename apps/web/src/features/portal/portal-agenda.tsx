"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  AgendaEvent,
  AgendaHolidays,
  PersonalAgenda,
  WorkspaceRole,
} from "@esapiens/contracts";
import { PortalUnavailable } from "./portal-ui";
import { ActionFeedback } from "@/features/classroom/academic-action";
import { ReminderForm, ReminderToggle } from "./agenda-forms";
import { AgendaCalendar } from "./agenda-calendar";
import {
  agendaLabels,
  agendaRange,
  dateInZone,
  eventPath,
  isCalendarDay,
  shiftDay,
  shiftMonth,
  validAgenda,
  validHolidays,
  type AgendaKind,
  type AgendaView,
} from "./agenda-data";
import styles from "./agenda-calendar.module.css";

const dateFormatter = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "long",
  timeZone: "UTC",
});
const shortFormatter = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeZone: "UTC",
});
const labelDate = (day: string, short = false) =>
  (short ? shortFormatter : dateFormatter).format(new Date(`${day}T12:00:00Z`));
const eventKey = (event: AgendaEvent) => `${event.kind}:${event.id}`;

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
  const href = eventPath(event, role);
  const status =
    event.kind === "feriado"
      ? "Informativo"
      : event.done
        ? "Completado"
        : event.kind === "clase"
          ? "Programada"
          : event.kind === "evaluacion"
            ? event.activityId && event.activityId !== event.id
              ? "Intento en curso"
              : "Disponible"
            : "Pendiente";
  const format = (instant: string) =>
    new Intl.DateTimeFormat("es-BO", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    }).format(new Date(instant));
  return (
    <article
      className={`mt-5 rounded-2xl border border-line p-4 sm:p-5 ${styles[event.kind]}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className={styles.dot} aria-hidden="true" />
        {agendaLabels[event.kind]}
        <span className="ml-auto rounded-full border border-current px-2 py-1">
          {status}
        </span>
      </div>
      <h3 className="mt-4 break-words text-xl font-semibold text-ink">
        {event.title}
      </h3>
      {event.course && (
        <p className="mt-2 text-sm font-medium text-ink">{event.course}</p>
      )}
      <p className="mt-3 text-sm text-muted">{event.detail}</p>
      {event.occursAt ? (
        <p className="mt-3 text-sm text-ink">
          <time dateTime={event.occursAt}>{format(event.occursAt)}</time>
          {event.endsAt && (
            <>
              {" "}
              — <time dateTime={event.endsAt}>{format(event.endsAt)}</time>
            </>
          )}
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">
          Todo el día · {labelDate(event.day, true)}
        </p>
      )}
      {event.kind === "recordatorio" && (
        <ReminderToggle
          id={event.id}
          done={event.done}
          role={role}
          onSaved={onSaved}
        />
      )}
      {href && (
        <Link href={href} className="button button-primary mt-5">
          {event.kind === "tarea"
            ? "Abrir tarea y entregas"
            : event.kind === "evaluacion"
              ? "Abrir evaluaciones"
              : "Abrir materia"}{" "}
          →
        </Link>
      )}
      {event.kind === "feriado" && (
        <p className="mt-4 text-xs text-muted">
          Fuente:{" "}
          <a
            href="https://nagerholidays.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
          >
            Nager.Date
          </a>
          . Su información no cambia las fechas académicas.
        </p>
      )}
    </article>
  );
}

export function PortalAgenda({
  role,
  compact = false,
  timeZone,
  month: initialMonth,
  day: initialDay,
  today: initialToday,
}: {
  role: WorkspaceRole;
  compact?: boolean;
  timeZone: string;
  month?: string;
  day?: string;
  today?: string;
}) {
  const [today] = useState(
    () => initialToday ?? dateInZone(new Date(), timeZone),
  );
  const [selection, setSelection] = useState({
    month: initialMonth,
    day: initialDay,
  });
  const [view, setView] = useState<AgendaView>("month");
  const [type, setType] = useState<AgendaKind | "todos">("todos");
  const [selectedKey, setSelectedKey] = useState("");
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<{
    key: string;
    data?: PersonalAgenda;
  } | null>(null);
  const [holidaySnapshot, setHolidaySnapshot] = useState<{
    key: string;
    data: AgendaHolidays[];
  } | null>(null);
  const [exporting, setExporting] = useState(false);
  const exportBusy = useRef(false);
  const [exportFeedback, setExportFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const inflight = useRef(new Map<string, Promise<PersonalAgenda>>());
  const holidays = useRef(new Map<string, Promise<AgendaHolidays>>());
  const dayButtons = useRef(new Map<string, HTMLButtonElement>());
  const refresh = () => setRevision((value) => value + 1);
  const month =
    selection.month && /^20\d{2}-(0[1-9]|1[0-2])$/.test(selection.month)
      ? selection.month
      : today.slice(0, 7);
  const day =
    isCalendarDay(selection.day) && selection.day.startsWith(month + "-")
      ? selection.day
      : today.startsWith(month)
        ? today
        : `${month}-01`;
  const activeView = compact ? "month" : view;
  const period = agendaRange(activeView, month, day, today);
  // Canonical period anchor: changing the selected day in a month/week does not
  // repeat the request. Inflight reads are shared across Strict Mode effects.
  const query = new URLSearchParams({
    role,
    month: period.anchor.slice(0, 7),
    day: period.anchor,
    view: activeView,
    type,
  }).toString();
  const requestKey = `${query}:${revision}`;
  const pending = snapshot?.key !== requestKey;
  const data = pending ? undefined : snapshot?.data;
  useEffect(() => {
    let cancelled = false;
    let request = inflight.current.get(requestKey);
    if (!request) {
      request = fetch(`/api/academic/agenda?${query}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }).then(async (response) => {
        const value: unknown = await response.json();
        if (!response.ok || !validAgenda(value)) throw new Error();
        return value;
      });
      inflight.current.set(requestKey, request);
      const reads = inflight.current;
      void request.then(
        () => reads.delete(requestKey),
        () => reads.delete(requestKey),
      );
    }
    void request.then(
      (value) => {
        if (!cancelled) setSnapshot({ key: requestKey, data: value });
      },
      () => {
        if (!cancelled) setSnapshot({ key: requestKey });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [query, requestKey]);
  const yearKey = [
    ...new Set([period.from.slice(0, 4), period.to.slice(0, 4)]),
  ].join(",");
  const holidayKey = `${role}:${yearKey}`;
  useEffect(() => {
    let cancelled = false;
    const requests = yearKey.split(",").map((year) => {
      const key = `${role}:${year}`;
      let request = holidays.current.get(key);
      if (!request) {
        request = fetch(
          `/api/academic/agenda/holidays?${new URLSearchParams({ role, year })}`,
          { cache: "no-store", signal: AbortSignal.timeout(5000) },
        ).then(async (response) => {
          const value: unknown = await response.json();
          if (!response.ok || !validHolidays(value)) throw new Error();
          return value;
        });
        holidays.current.set(key, request);
        const reads = holidays.current;
        void request.then(
          (value) => {
            if (value.status !== "available") reads.delete(key);
          },
          () => reads.delete(key),
        );
      }
      return request;
    });
    void Promise.all(requests).then(
      (values) => {
        if (!cancelled) setHolidaySnapshot({ key: holidayKey, data: values });
      },
      () => {
        if (!cancelled) setHolidaySnapshot({ key: holidayKey, data: [] });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [yearKey, role, holidayKey, revision]);
  const holidayPending = holidaySnapshot?.key !== holidayKey;
  const holidayAvailable =
    !holidayPending &&
    !!holidaySnapshot?.data.length &&
    holidaySnapshot.data.every((h) => h.status === "available");
  const holidayEvents =
    holidayAvailable && (type === "todos" || type === "feriado")
      ? holidaySnapshot.data
          .flatMap((h) => h.events)
          .filter((e) => e.day >= period.from && e.day <= period.to)
      : [];
  const events = [...(data?.periodEvents ?? []), ...holidayEvents].sort(
    (a, b) =>
      a.day.localeCompare(b.day) ||
      (a.occursAt ?? "").localeCompare(b.occursAt ?? "") ||
      a.title.localeCompare(b.title),
  );
  const selectedEvents = events.filter((e) => e.day === day);
  const selectedEvent =
    events.find((e) => eventKey(e) === selectedKey) ?? selectedEvents[0];
  const counts = new Map<
    string,
    { count: number; pending: number; kinds: Set<AgendaKind> }
  >(
    (data?.days ?? []).map((d) => [
      d.day,
      { count: d.count, pending: d.pending ?? 0, kinds: new Set<AgendaKind>() },
    ]),
  );
  for (const event of events) {
    const c = counts.get(event.day) ?? {
      count: 0,
      pending: 0,
      kinds: new Set<AgendaKind>(),
    };
    if (event.kind === "feriado") c.count++;
    c.kinds.add(event.kind);
    counts.set(event.day, c);
  }
  function selectDay(date: string, focus = false) {
    setSelection({ month: date.slice(0, 7), day: date });
    setSelectedKey("");
    if (focus)
      requestAnimationFrame(() => dayButtons.current.get(date)?.focus());
  }
  function selectEvent(event: AgendaEvent) {
    setSelection({ month: event.day.slice(0, 7), day: event.day });
    setSelectedKey(eventKey(event));
  }
  const start = new Date(`${month}-01T12:00:00Z`);
  const numberOfDays = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const visibleDays =
    activeView === "week"
      ? Array.from(
          {
            length:
              Math.round(
                (Date.parse(period.to) - Date.parse(period.from)) / 86400000,
              ) + 1,
          },
          (_, i) => shiftDay(period.from, i),
        )
      : Array.from(
          { length: numberOfDays },
          (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
        );
  const previous =
    activeView === "week"
      ? period.from === "2000-01-01"
        ? null
        : shiftDay(day, -7)
      : month === "2000-01"
        ? null
        : shiftMonth(month, -1);
  const next =
    activeView === "week"
      ? period.to === "2099-12-31"
        ? null
        : shiftDay(day, 7)
      : month === "2099-12"
        ? null
        : shiftMonth(month, 1);
  const heading =
    activeView === "week"
      ? `${labelDate(period.from, true)} – ${labelDate(period.to, true)}`
      : new Intl.DateTimeFormat("es-BO", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(start);
  async function download() {
    if (exportBusy.current) return;
    exportBusy.current = true;
    setExporting(true);
    setExportFeedback(null);
    try {
      const response = await fetch(`/api/academic/agenda/export.ics?${query}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (
        !response.ok ||
        !response.headers.get("Content-Type")?.includes("text/calendar")
      )
        throw new Error();
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        response.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? "esapiens-agenda.ics";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportFeedback({
        ok: true,
        message: "Calendario descargado con el período y filtro seleccionados.",
      });
    } catch {
      setExportFeedback({
        ok: false,
        message:
          "No se pudo descargar el calendario. Revisa tu sesión o selecciona una semana para reducir el período.",
      });
    } finally {
      exportBusy.current = false;
      setExporting(false);
    }
  }
  const listEvents =
    activeView === "month"
      ? (data?.upcoming ?? []).slice(0, compact ? 6 : 8)
      : events;
  return (
    <div
      className={
        compact
          ? "w-full min-w-0 space-y-4"
          : "grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]"
      }
    >
      <section
        className={`ui-card min-w-0 ${compact ? "p-3 sm:p-4" : "p-4 sm:p-6"}`}
        aria-label="Calendario de actividades"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="eyebrow">
            {compact ? "Mi calendario" : "Agenda académica"}
          </p>
          <button
            type="button"
            onClick={() => selectDay(today)}
            className="button button-secondary"
          >
            Hoy
          </button>
        </div>
        {!compact && (
          <div
            role="group"
            aria-label="Vista del calendario"
            className="mt-4 grid grid-cols-3 gap-2"
          >
            {(
              [
                ["month", "Mes"],
                ["week", "Semana"],
                ["upcoming", "Próximos"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={activeView === value}
                onClick={() => setView(value)}
                className={`button ${activeView === value ? "button-primary" : "button-secondary"}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <div className={`mt-4 grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
          <label className="form-label">
            Tipo de actividad
            <select
              className="form-input"
              value={type}
              onChange={(e) => setType(e.target.value as AgendaKind | "todos")}
            >
              <option value="todos">Todas las actividades</option>
              {Object.entries(agendaLabels).map(([kind, label]) => (
                <option key={kind} value={kind}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {!compact && activeView !== "upcoming" && (
            <label className="form-label">
              Ir al mes
              <input
                type="month"
                className="form-input"
                min="2000-01"
                max="2099-12"
                value={month}
                onChange={(e) => {
                  if (/^20\d{2}-(0[1-9]|1[0-2])$/.test(e.target.value))
                    selectDay(`${e.target.value}-01`);
                }}
              />
            </label>
          )}
        </div>
        <ul
          aria-label="Leyenda de actividades"
          className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs"
        >
          {Object.entries(agendaLabels).map(([kind, label]) => (
            <li
              key={kind}
              className={`inline-flex items-center gap-2 ${styles[kind]}`}
            >
              <span className={styles.dot} aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
        {activeView !== "upcoming" ? (
          <AgendaCalendar
            month={activeView === "week" ? period.from : month}
            heading={heading}
            previousMonth={previous}
            nextMonth={next}
            compact={compact}
            pending={pending}
            unit={activeView === "week" ? "semana" : "mes"}
            onMonthChange={(target) =>
              activeView === "week"
                ? selectDay(target)
                : selectDay(`${target}-01`)
            }
          >
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(
                (label) => (
                  <span className="py-3" key={label}>
                    {label}
                  </span>
                ),
              )}
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {activeView === "month" &&
                Array.from({ length: (start.getUTCDay() + 6) % 7 }, (_, i) => (
                  <span key={`blank-${i}`} aria-hidden="true" />
                ))}
              {activeView === "week" &&
                Array.from(
                  {
                    length:
                      (new Date(`${period.from}T12:00:00Z`).getUTCDay() + 6) %
                      7,
                  },
                  (_, i) => <span key={`blank-${i}`} aria-hidden="true" />,
                )}
              {visibleDays.map((date) => {
                const activity = counts.get(date);
                return (
                  <button
                    ref={(node) => {
                      if (node) dayButtons.current.set(date, node);
                      else dayButtons.current.delete(date);
                    }}
                    type="button"
                    key={date}
                    onClick={() => selectDay(date)}
                    aria-pressed={date === day}
                    aria-current={date === today ? "date" : undefined}
                    aria-label={`${labelDate(date)}${date === today ? ", hoy" : ""}, ${activity?.count ?? 0} actividades, ${activity?.pending ?? 0} pendientes`}
                    className={`flex min-w-0 flex-col items-center justify-center rounded-xl border px-0.5 py-2 text-sm ${compact ? "min-h-11" : "min-h-16 sm:min-h-20"} ${date === day ? "border-brand bg-brand text-on-brand ring-2 ring-brand ring-offset-2 ring-offset-surface" : date === today ? "border-brand bg-brand-soft" : "border-line hover:bg-surface-soft"}`}
                    onKeyDown={(event) => {
                      const moves: Record<string, number> = {
                        ArrowLeft: -1,
                        ArrowRight: 1,
                        ArrowUp: -7,
                        ArrowDown: 7,
                      };
                      let target: string | undefined;
                      if (Object.hasOwn(moves, event.key))
                        target = shiftDay(date, moves[event.key]);
                      if (event.key === "Home")
                        target = shiftDay(
                          date,
                          -(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7,
                        );
                      if (event.key === "End")
                        target = shiftDay(
                          date,
                          6 -
                            ((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) %
                              7),
                        );
                      if (target) {
                        event.preventDefault();
                        selectDay(target, true);
                      }
                    }}
                  >
                    <strong>{Number(date.slice(-2))}</strong>
                    {!!activity?.pending && (
                      <span
                        className={`mt-1 text-[9px] font-semibold ${date === day ? "" : "text-warning"}`}
                        title={`${activity.pending} pendientes`}
                      >
                        ● {activity.pending}
                        <span className="sr-only"> pendientes</span>
                      </span>
                    )}
                    {!!activity?.count && (
                      <span className="mt-1 text-[10px]">
                        {activity.count}
                        <span className="sr-only"> actividades</span>
                      </span>
                    )}
                    {!!activity?.count && (
                      <span
                        className="mt-1 flex flex-wrap justify-center gap-0.5"
                        aria-hidden="true"
                      >
                        {[...activity.kinds].map((kind) => (
                          <span
                            key={kind}
                            className={`${styles.dot} ${styles[kind]} ${date === day ? styles.selectedDot : ""}`}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </AgendaCalendar>
        ) : (
          <h2 className="mt-6 text-lg font-semibold">
            Próximos 30 días · {labelDate(period.from, true)} –{" "}
            {labelDate(period.to, true)}
          </h2>
        )}
        <p className="mt-4 text-xs leading-6 text-muted">
          Zona horaria: {timeZone}. Las evaluaciones muestran la fecha de su
          registro o el vencimiento real de un intento.
        </p>
        <p role="status" className="mt-2 text-xs leading-6 text-muted">
          {holidayPending
            ? "Consultando feriados informativos…"
            : holidayAvailable
              ? "Feriados nacionales según Nager.Date; no cambian tus fechas académicas."
              : "Feriados no disponibles. Se muestran únicamente eventos internos."}
        </p>
        {pending ? (
          <p role="status" className="my-5 text-sm text-muted">
            Cargando agenda…
          </p>
        ) : !data ? (
          <>
            <PortalUnavailable />
            <button
              type="button"
              className="button button-secondary mt-3"
              onClick={refresh}
            >
              Reintentar
            </button>
          </>
        ) : (
          <div className="mt-5 border-t border-line pt-5">
            <h2 className="font-semibold">
              {activeView === "month"
                ? "Próximos pendientes"
                : activeView === "week"
                  ? "Actividades de la semana"
                  : "Próximos eventos"}
            </h2>
            <p className="mt-2 text-xs text-muted">
              {activeView === "month"
                ? "Clases, tareas, evaluaciones y recordatorios pendientes de los próximos 30 días."
                : `${events.length} actividades disponibles con el filtro seleccionado.`}
            </p>
            {listEvents.length ? (
              <ul
                className={`${compact ? "max-h-72" : "max-h-[32rem]"} mt-4 space-y-2 overflow-y-auto overscroll-contain p-1`}
              >
                {listEvents.map((event) => (
                  <li key={eventKey(event)}>
                    <button
                      type="button"
                      onClick={() => selectEvent(event)}
                      className={`w-full rounded-xl border p-3 text-left hover:border-brand ${eventKey(event) === eventKey(selectedEvent ?? event) && selectedEvent ? "border-brand bg-brand-soft" : "border-line"}`}
                    >
                      <span
                        className={`flex items-center gap-2 text-xs font-semibold ${styles[event.kind]}`}
                      >
                        <span className={styles.dot} aria-hidden="true" />
                        {agendaLabels[event.kind]} ·{" "}
                        {labelDate(event.day, true)}
                      </span>
                      <span className="mt-2 block break-words text-sm font-semibold">
                        {event.title}
                      </span>
                      {event.course && (
                        <span className="mt-1 block text-xs text-muted">
                          {event.course}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted">
                No hay eventos para este período y filtro.
              </p>
            )}
            {data.period && data.period.total > data.period.limit && (
              <p className="mt-4 text-sm text-warning">
                Se muestran {data.period.limit} de {data.period.total} eventos
                internos. Elige una semana o un tipo de actividad para ver el
                detalle.
              </p>
            )}
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-5">
          <button
            type="button"
            disabled={pending}
            className="button button-secondary"
            onClick={refresh}
          >
            Actualizar
          </button>
          <button
            type="button"
            disabled={exporting || pending || !data}
            onClick={() => void download()}
            className="button button-secondary"
          >
            {exporting ? "Generando calendario…" : "Descargar calendario .ics"}
          </button>
          {compact && (
            <Link
              href={`/portal/${role}/agenda`}
              className="button button-primary"
            >
              Agenda completa →
            </Link>
          )}
        </div>
        <ActionFeedback feedback={exportFeedback} />
      </section>
      <section
        className={`ui-card min-w-0 ${compact ? "p-4" : "p-5 sm:p-6"}`}
        aria-label="Detalle del día y de la actividad"
      >
        <p className="eyebrow">Día seleccionado</p>
        <h2 className="mt-2 text-xl font-semibold">{labelDate(day)}</h2>
        {!pending &&
          data &&
          (selectedEvents.length ? (
            <>
              <p className="mt-2 text-sm text-muted">
                {selectedEvents.length} actividades. Elige una para abrir su
                detalle.
              </p>
              <ul className="mt-4 space-y-2">
                {selectedEvents.map((event) => (
                  <li key={eventKey(event)}>
                    <button
                      type="button"
                      aria-pressed={
                        eventKey(event) === eventKey(selectedEvent ?? event)
                      }
                      onClick={() => setSelectedKey(eventKey(event))}
                      className={`flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm ${eventKey(event) === eventKey(selectedEvent ?? event) ? "border-brand bg-brand-soft" : "border-line hover:border-brand"}`}
                    >
                      <span
                        className={`${styles.dot} ${styles[event.kind]}`}
                        aria-hidden="true"
                      />
                      <span className="break-words">{event.title}</span>
                      {event.done && (
                        <span className="ml-auto text-xs text-success">
                          Hecho
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="my-5 text-sm text-muted">
              No hay actividades para este día y filtro. Puedes añadir un
              recordatorio personal.
            </p>
          ))}
        {selectedEvent && (
          <EventDetails
            event={selectedEvent}
            role={role}
            timeZone={timeZone}
            onSaved={refresh}
          />
        )}
        {compact ? (
          <details className="mt-5">
            <summary className="text-link cursor-pointer py-3 text-sm">
              Añadir recordatorio personal
            </summary>
            <ReminderForm key={day} day={day} role={role} onSaved={refresh} />
          </details>
        ) : (
          <ReminderForm key={day} day={day} role={role} onSaved={refresh} />
        )}
      </section>
    </div>
  );
}

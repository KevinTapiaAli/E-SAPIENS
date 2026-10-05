import Link from "next/link";
import type { PersonalAgenda } from "@esapiens/contracts";
import { readPrivateApi } from "@/features/auth/server";
import { isRecord } from "@/shared/api/public-api";
import { PortalUnavailable } from "./portal-ui";
import { ReminderForm, ReminderToggle } from "./agenda-forms";

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
    v.events.every(
      (e) =>
        isRecord(e) &&
        typeof e.id === "string" &&
        typeof e.title === "string" &&
        typeof e.day === "string" &&
        ["recordatorio", "tarea", "clase"].includes(String(e.kind)) &&
        typeof e.done === "boolean" &&
        (e.courseId === null || typeof e.courseId === "string") &&
        (e.course === null || typeof e.course === "string"),
    )
  );
}
export async function AdminAgenda({
  timeZone,
  month: requestedMonth,
  day: requestedDay,
}: {
  timeZone: string;
  month?: string;
  day?: string;
}) {
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
  const query = new URLSearchParams({ month, day });
  const result = await readPrivateApi(`academic/agenda?${query}`, valid);
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
    <div className="grid items-start gap-6 xl:grid-cols-[1.3fr_1fr]">
      <section className="ui-card overflow-hidden p-5 sm:p-7">
        <p className="eyebrow">Tu agenda de coordinación</p>
        <div className="my-5 flex items-center justify-between gap-2">
          <Link
            aria-label="Mes anterior"
            prefetch={false}
            href={`?month=${shift(-1)}`}
            className="button button-secondary"
          >
            ←
          </Link>
          <h2 className="text-center text-xl font-semibold capitalize">
            {heading}
          </h2>
          <Link
            aria-label="Mes siguiente"
            prefetch={false}
            href={`?month=${shift(1)}`}
            className="button button-secondary"
          >
            →
          </Link>
        </div>
        <div className="grid grid-cols-7 text-center text-xs text-muted">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
            <span className="py-3" key={d}>
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {Array.from({ length: (start.getUTCDay() + 6) % 7 }, (_, i) => (
            <span key={`blank-${i}`} aria-hidden />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const date = `${month}-${String(i + 1).padStart(2, "0")}`;
            const count =
              result.data?.days.find((d) => d.day === date)?.count ?? 0;
            return (
              <Link
                key={date}
                prefetch={false}
                href={`?month=${month}&day=${date}`}
                aria-current={date === day ? "date" : undefined}
                aria-label={`${date}${count ? `, ${count} actividades` : ""}`}
                className={`flex min-h-16 flex-col items-center justify-center rounded-xl border text-sm transition-colors sm:min-h-20 ${date === day ? "border-brand bg-brand text-white" : date === today ? "border-brand bg-brand-soft" : "border-line hover:bg-brand-soft"}`}
              >
                <strong>{i + 1}</strong>
                {count > 0 && (
                  <span className="mt-1 text-[10px]">
                    {count} <span className="hidden sm:inline">activ.</span>
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        <p className="mt-5 text-xs leading-6 text-muted">
          Fechas de clases, plazos de tareas publicadas y tus recordatorios
          personales. Zona horaria: {timeZone}.
        </p>
      </section>
      <section className="ui-card p-5 sm:p-6">
        <p className="eyebrow">El día que elegiste</p>
        <h2 className="mt-2 text-xl font-semibold">
          {new Intl.DateTimeFormat("es-BO", {
            dateStyle: "long",
            timeZone: "UTC",
          }).format(new Date(`${day}T12:00:00Z`))}
        </h2>
        {!result.data ? (
          <PortalUnavailable />
        ) : (
          <>
            {!result.data.events.length ? (
              <p className="my-6 text-sm text-muted">
                No hay actividades registradas para este día. Puedes reservarlo
                para planificar o añadir un recordatorio.
              </p>
            ) : (
              <ul className="mt-5 space-y-4">
                {result.data.events.map((event) => (
                  <li
                    key={`${event.kind}-${event.id}`}
                    className="rounded-xl border border-line p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                      {event.kind === "tarea"
                        ? "Plazo de tarea"
                        : event.kind === "clase"
                          ? "Clase programada"
                          : "Mi recordatorio"}
                      {event.done ? " · Completado" : ""}
                    </p>
                    <h3
                      className={`mt-2 font-medium ${event.done ? "line-through text-muted" : ""}`}
                    >
                      {event.title}
                    </h3>
                    {event.course && (
                      <p className="mt-1 text-xs text-muted">{event.course}</p>
                    )}
                    {event.kind === "recordatorio" ? (
                      <ReminderToggle id={event.id} done={event.done} />
                    ) : (
                      event.kind === "tarea" && (
                        <Link
                          href={`/portal/administrador/cursos/${event.courseId}/tareas/${event.id}`}
                          className="text-link mt-3 inline-flex min-h-11 items-center text-sm"
                        >
                          Consultar tarea →
                        </Link>
                      )
                    )}
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
        <ReminderForm key={day} day={day} />
      </section>
    </div>
  );
}

import Link from "next/link";
import { readPrivateApi } from "@/features/auth/server";
import { formatAccountDate } from "@/features/auth/format-date";
import { isAcademicOverview } from "@/features/portal/server";
import { PortalUnavailable } from "@/features/portal/portal-ui";
import { Icon } from "@/shared/ui/icon";

export async function TeacherAttention({ timeZone }: { timeZone: string }) {
  const result = await readPrivateApi(
    "academic/overview/docente",
    isAcademicOverview,
  );
  const attention = result.data?.teachingAttention;
  if (!attention) return <PortalUnavailable />;
  const total = attention.pendingGrading.reduce(
    (sum, course) => sum + course.count,
    0,
  );
  return (
    <section className="mb-8 space-y-4" aria-label="Prioridades docentes">
      <div>
        <p className="eyebrow">Tu jornada docente</p>
        <h2 className="mt-2 text-2xl font-semibold">
          Empieza por lo que necesita atención
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <article className="ui-card border-t-4 border-t-warning p-5">
          <Icon name="clipboard" className="h-6 w-6 text-warning" />
          <h3 className="mt-3 font-semibold">Entregas por calificar</h3>
          <p className="mt-2 text-3xl font-bold tabular-nums">{total}</p>
          <p className="mt-2 text-xs text-muted">
            Última entrega de cada estudiante y tarea publicada, todavía sin
            nota.
          </p>
          {attention.pendingGrading.length ? (
            <ul className="mt-3 space-y-2">
              {attention.pendingGrading.map((c) => (
                <li key={c.courseId}>
                  <Link
                    className="text-link inline-flex min-h-11 items-center text-sm"
                    href={`/portal/docente/cursos/${c.courseId}/tareas`}
                  >
                    {c.course}: {c.count} →
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-success">
              Sin entregas pendientes de nota.
            </p>
          )}
        </article>
        <article className="ui-card p-5">
          <Icon name="calendar" className="h-6 w-6 text-brand" />
          <h3 className="mt-3 font-semibold">Próximas clases</h3>
          {attention.upcomingClasses.length ? (
            <ul className="mt-3 space-y-4">
              {attention.upcomingClasses.map((c) => (
                <li key={c.id}>
                  <p className="text-sm font-semibold">{c.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatAccountDate(c.startsAt, timeZone)}
                  </p>
                  <Link
                    className="text-link inline-flex min-h-11 items-center text-sm"
                    href={`/portal/docente/cursos/${c.courseId}`}
                  >
                    {c.course} →
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">
              No tienes clases futuras programadas.
            </p>
          )}
        </article>
        <article className="ui-card p-5">
          <Icon name="users" className="h-6 w-6 text-brand" />
          <h3 className="mt-3 font-semibold">Inscripciones por revisar</h3>
          <p className="mt-2 text-3xl font-bold tabular-nums">
            {attention.pendingRequests}
          </p>
          <Link
            href="/portal/docente/inscripciones"
            className="text-link mt-3 inline-flex min-h-11 items-center text-sm"
          >
            Revisar solicitudes →
          </Link>
          <Link
            href="/portal/docente/seguimiento"
            className="text-link mt-2 inline-flex min-h-11 items-center text-sm"
          >
            Mis estudiantes y calificaciones →
          </Link>
        </article>
      </div>
    </section>
  );
}

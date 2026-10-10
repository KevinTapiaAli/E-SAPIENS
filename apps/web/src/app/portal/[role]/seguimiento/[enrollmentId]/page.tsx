import Link from "next/link";
import { notFound } from "next/navigation";
import { portalSession } from "@/features/portal/server";
import { readPrivateApi } from "@/features/auth/server";
import { isResourceId } from "@/features/classroom/server";
import { isProgressDetail } from "@/features/progress/server";
import { LearningProgress } from "@/features/progress/progress-ui";
import {
  PortalHeading,
  PortalUnavailable,
  StatusBadge,
} from "@/features/portal/portal-ui";
import { DashboardRefresh } from "@/features/portal/dashboard-refresh";
import { ProgressBar } from "@/shared/ui/progress-bar";
import { StatePanel } from "@/shared/ui/state-panel";
import { formatAccountDate } from "@/features/auth/format-date";

export default async function StudentProgressPage({
  params,
}: {
  params: Promise<{ role: string; enrollmentId: string }>;
}) {
  const { role, enrollmentId } = await params;
  if (
    !["administrador", "docente"].includes(role) ||
    !isResourceId(enrollmentId)
  )
    notFound();
  const user = await portalSession();
  const result = await readPrivateApi(
    `academic/progress/${enrollmentId}?role=${role}`,
    isProgressDetail,
  );
  if (result.status === 404 || result.status === 403) notFound();
  if (!result.data) return <PortalUnavailable />;
  const { enrollment, modules } = result.data;
  return (
    <>
      <Link
        className="text-link mb-5 inline-flex min-h-11 items-center text-sm"
        href={`/portal/${role}/seguimiento?courseId=${enrollment.courseId}`}
      >
        ← Estudiantes de esta materia
      </Link>
      <PortalHeading
        eyebrow="Seguimiento individual"
        title={enrollment.student}
        description={enrollment.course}
      />
      <DashboardRefresh />
      <section
        aria-label="Resumen de la matrícula"
        className="ui-card mb-7 grid gap-6 p-6 md:grid-cols-3"
      >
        <LearningProgress progress={enrollment} />
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted">Matrícula</dt>
            <dd className="mt-1">
              <StatusBadge status={enrollment.enrollmentStatus} />
            </dd>
          </div>
          <div>
            <dt className="text-muted">Fecha de inscripción</dt>
            <dd className="mt-1">
              {formatAccountDate(enrollment.enrolledAt, user.timeZone)}
            </dd>
          </div>
        </dl>
        <div className="text-sm">
          <p className="text-muted">Último avance registrado</p>
          <p className="mt-1 font-medium">
            {enrollment.lastActivityAt
              ? formatAccountDate(enrollment.lastActivityAt, user.timeZone)
              : "Aún sin registros"}
          </p>
          {enrollment.inactive && (
            <p className="mt-3 text-warning">
              Han pasado 14 días sin avance registrado. Consulta si necesita
              apoyo para continuar.
            </p>
          )}
        </div>
      </section>
      {role === "administrador" && (
        <div className="mb-7 flex flex-wrap gap-3">
          <Link
            href={`/portal/administrador/matriculas/${enrollment.id}`}
            className="button button-primary"
          >
            Gestionar matrícula y acceso
          </Link>
          <Link
            href={`/portal/administrador/cursos/${enrollment.courseId}`}
            className="button button-secondary"
          >
            Gestionar materia
          </Link>
        </div>
      )}
      <h2 className="mb-4 text-xl font-semibold">Avance por módulo</h2>
      <p className="mb-5 text-sm text-muted">
        Solo se cuentan lecciones y módulos publicados. La disponibilidad
        también depende de la cuenta, la matrícula y los requisitos previos.
        Completar las lecciones no acredita por sí solo la aprobación del curso.
      </p>
      {!modules.length ? (
        <StatePanel
          title="Sin módulos publicados"
          description="El avance se mostrará cuando la materia tenga contenido publicado."
        />
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {modules.map((module, index) => (
            <li key={module.id} className="ui-card p-6">
              <div className="mb-5 flex items-start gap-3">
                <span className="rounded-xl bg-brand-soft px-3 py-2 text-sm font-semibold text-brand">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="font-semibold leading-7">{module.title}</h3>
              </div>
              {module.totalLessons ? (
                <ProgressBar
                  value={Math.round(
                    (100 * module.completedLessons) / module.totalLessons,
                  )}
                  label="Lecciones completadas"
                />
              ) : (
                <p className="text-sm text-muted">Sin lecciones publicadas</p>
              )}
              <p className="mt-2 text-sm text-muted">
                {module.completedLessons} de {module.totalLessons} lecciones
              </p>
              <p
                className={`mt-4 rounded-lg px-3 py-2 text-sm ${module.available ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}
              >
                {module.available
                  ? "Disponible para el estudiante"
                  : !module.hasCoverage
                    ? "Sin cobertura vigente"
                    : "Acceso condicionado por matrícula, cuenta o requisitos académicos"}
              </p>
              <p className="mt-3 text-xs text-muted">
                Último avance:{" "}
                {module.lastActivityAt
                  ? formatAccountDate(module.lastActivityAt, user.timeZone)
                  : "Sin registros"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

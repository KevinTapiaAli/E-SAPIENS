import Link from "next/link";
import type { AcademicCourse, WorkspaceRole } from "@esapiens/contracts";
import { Icon } from "@/shared/ui/icon";
import { StatePanel } from "@/shared/ui/state-panel";
import { ProgressBar } from "@/shared/ui/progress-bar";
import { statusLabels } from "./navigation";

export function PortalHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-muted">{description}</p>
    </div>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const color = ["aprobado", "aprobada", "publicado", "activa"].includes(status)
    ? "bg-success-soft text-success"
    : ["pendiente", "revision"].includes(status)
      ? "bg-warning-soft text-warning"
      : "bg-surface-soft text-muted";
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${color}`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
export function CourseCards({
  courses,
  role,
}: {
  courses: AcademicCourse[];
  role: WorkspaceRole;
}) {
  if (!courses.length)
    return (
      <StatePanel
        title={
          role === "estudiante"
            ? "Todavía no tienes cursos inscritos"
            : role === "docente"
              ? "Todavía no tienes cursos asignados"
              : "No hay cursos para mostrar"
        }
        description={
          role === "estudiante"
            ? "Cuando el docente apruebe tu inscripción, tu materia aparecerá aquí."
            : "Los cursos disponibles aparecerán en esta sección."
        }
      />
    );
  return (
    <ul className="grid min-w-0 gap-4 md:grid-cols-2">
      {courses.map((course) => (
        <li key={course.id} className="ui-card min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-soft px-5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-brand">
              <Icon name="book" />
            </span>
            <span className="truncate text-xs font-medium text-muted">
              {course.category}
            </span>
          </div>
          <div className="p-5">
            <StatusBadge status={course.enrollmentStatus ?? course.status} />
            <h3 className="mt-3 text-lg font-semibold leading-7">
              {course.title}
            </h3>
            <p className="mt-2 text-sm text-muted">
              {course.teachers.length
                ? `Docente: ${course.teachers.join(", ")}`
                : "Docente por asignar"}
            </p>
            <div className="mt-5 border-t border-line pt-4">
              {role === "estudiante" ? (
                course.totalLessons > 0 ? (
                  <>
                    <ProgressBar
                      label="Avance registrado"
                      value={Math.round(
                        (100 * (course.completedLessons ?? 0)) /
                          course.totalLessons,
                      )}
                    />
                    <p className="mt-2 text-xs text-muted">
                      {course.completedLessons ?? 0} de {course.totalLessons}{" "}
                      lecciones completadas
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted">
                    Sin lecciones publicadas todavía.
                  </p>
                )
              ) : (
                <div className="flex flex-wrap justify-between gap-2 text-sm text-muted">
                  <span>{course.enrollmentCount ?? 0} matrículas activas</span>
                  <span>{course.totalLessons} lecciones</span>
                </div>
              )}
            </div>
          </div>
          {role === "estudiante" && (
            <div className="px-5 pb-5">
              <Link
                href={`/portal/estudiante/cursos/${course.id}`}
                className="button button-primary w-full"
              >
                Ver materia y acceso <Icon name="arrow" />
              </Link>
            </div>
          )}
          {role === "estudiante" &&
            course.enrollmentStatus === "activa" &&
            course.status === "publicado" && (
              <div className="grid grid-cols-2 gap-2 px-5 pb-5">
                <Link
                  prefetch={false}
                  className="button button-secondary text-sm"
                  href={`/portal/estudiante/cursos/${course.id}/materiales`}
                >
                  Materiales
                </Link>
                <Link
                  prefetch={false}
                  className="button button-secondary text-sm"
                  href={`/portal/estudiante/cursos/${course.id}/tareas`}
                >
                  Tareas
                </Link>
              </div>
            )}
          {role === "administrador" && (
            <div className="px-5 pb-5">
              <Link
                className="button button-secondary w-full"
                href={`/portal/administrador/cursos/${course.id}`}
              >
                Gestionar materia <Icon name="arrow" />
              </Link>
            </div>
          )}
          {role !== "estudiante" && (
            <div className="px-5 pb-5">
              <Link
                className="button button-secondary w-full"
                href={`/portal/${role}/seguimiento?courseId=${course.id}`}
              >
                Ver estudiantes y avance <Icon name="arrow" />
              </Link>
            </div>
          )}
          {role === "docente" && (
            <div className="px-5 pb-5">
              <Link
                href={`/portal/docente/cursos/${course.id}`}
                className="button button-primary w-full"
              >
                Gestionar materiales y tareas <Icon name="arrow" />
              </Link>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
export function Distribution({
  items,
  title,
  description,
}: {
  items: { label: string; value: number }[];
  title: string;
  description: string;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <section className="ui-card p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted">{description}</p>
      <dl className="mt-6 space-y-5">
        {items.map((item, index) => (
          <div key={item.label}>
            <div className="flex justify-between gap-4 text-sm">
              <dt>{statusLabels[item.label] ?? item.label}</dt>
              <dd className="font-semibold">{item.value}</dd>
            </div>
            <div
              aria-hidden="true"
              className="mt-2 h-2 rounded-full bg-surface-soft"
            >
              <div
                className={`h-full rounded-full ${index % 2 ? "bg-accent" : "bg-brand"}`}
                style={{ width: `${total ? (item.value / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </dl>
      {!total && (
        <p className="mt-5 text-sm text-muted">
          Los indicadores se actualizarán cuando haya registros.
        </p>
      )}
    </section>
  );
}
export function PortalSearch({
  q,
  placeholder,
}: {
  q: string;
  placeholder: string;
}) {
  return (
    <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
      <label className="form-label min-w-0 grow">
        Buscar
        <input
          className="form-input"
          name="q"
          defaultValue={q}
          maxLength={100}
          placeholder={placeholder}
        />
      </label>
      <button className="button button-secondary">Buscar</button>
    </form>
  );
}
export function PortalPagination({
  base,
  cursor,
  next,
  q = "",
}: {
  base: string;
  cursor?: string;
  next: string | null;
  q?: string;
}) {
  const query = new URLSearchParams({
    ...(q ? { q } : {}),
    ...(next ? { cursor: next } : {}),
  });
  return (
    <nav aria-label="Paginación" className="mt-6 flex flex-wrap gap-3">
      {cursor && (
        <Link
          href={q ? `${base}?${new URLSearchParams({ q })}` : base}
          className="button button-secondary"
        >
          Primera página
        </Link>
      )}
      {next && (
        <Link href={`${base}?${query}`} className="button button-secondary">
          Más resultados
          <Icon name="arrow" />
        </Link>
      )}
    </nav>
  );
}
export function PortalUnavailable() {
  return (
    <StatePanel
      type="error"
      title="No pudimos cargar esta información"
      description="Comprueba tus permisos y vuelve a intentarlo en unos momentos."
    />
  );
}

import Link from "next/link";
import type { SessionUser } from "@esapiens/contracts";
import { readPrivateApi } from "@/features/auth/server";
import { isResourceId } from "@/features/classroom/server";
import { PortalHeading, PortalUnavailable } from "@/features/portal/portal-ui";
import { DashboardRefresh } from "@/features/portal/dashboard-refresh";
import { isProgressPage } from "./server";
import { ProgressStudents } from "./progress-ui";
import { CourseChoice } from "@/features/portal/course-choice";

export type ProgressFilters = {
  q?: string;
  cursor?: string;
  courseId?: string;
  state?: string;
  stage?: string;
  topic?: string;
  category?: string;
  month?: string;
};
export async function ProgressSection({
  role,
  user,
  filters,
}: {
  role: "administrador" | "docente";
  user: SessionUser;
  filters: ProgressFilters;
}) {
  const q = typeof filters.q === "string" ? filters.q.slice(0, 100) : "";
  const courseId = isResourceId(filters.courseId ?? "")
    ? filters.courseId
    : undefined;
  const cursor = isResourceId(filters.cursor ?? "")
    ? filters.cursor
    : undefined;
  const state = [
    "todos",
    "activa",
    "suspendida",
    "abandonada",
    "cancelada",
  ].includes(filters.state ?? "")
    ? filters.state!
    : role === "docente"
      ? "todos"
      : "activa";
  const stage = [
    "todos",
    "sin_iniciar",
    "en_curso",
    "completado",
    "sin_contenido",
    "sin_actividad",
    "sin_cobertura",
  ].includes(filters.stage ?? "")
    ? filters.stage!
    : "todos";
  const query = new URLSearchParams({
    role,
    q,
    state,
    stage,
    ...(courseId ? { courseId } : {}),
    ...(cursor ? { cursor } : {}),
  });
  const result =
    role === "administrador" && !courseId
      ? { status: 200 }
      : await readPrivateApi(`academic/progress?${query}`, isProgressPage);
  const base = `/portal/${role}/seguimiento`;
  const pagination = new URLSearchParams(query);
  pagination.delete("role");
  pagination.delete("cursor");
  const firstPage = `${base}?${pagination}`;
  if (result.data?.nextCursor) pagination.set("cursor", result.data.nextCursor);
  return (
    <>
      <PortalHeading
        eyebrow={
          role === "docente"
            ? "Acompañamiento docente"
            : "Seguimiento académico"
        }
        title={
          role === "docente" ? "Mis estudiantes" : "Avance de los estudiantes"
        }
        description={
          role === "docente"
            ? "Identifica quién necesita acompañamiento y consulta su avance en las materias a tu cargo."
            : "Consulta el avance de cada matrícula y resuelve las incidencias de acceso desde un mismo lugar."
        }
      />
      <DashboardRefresh />
      <form
        method="get"
        className="ui-card mb-6 grid items-end gap-4 p-5 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_auto]"
      >
        <div className="sm:col-span-2 xl:col-span-4">
          <CourseChoice
            role={role}
            value={courseId}
            required={role === "administrador"}
          />
        </div>
        {(role === "docente" || courseId) && (
          <>
            <label className="form-label">
              Nombre del estudiante
              <input
                name="q"
                className="form-input"
                defaultValue={q}
                maxLength={100}
                placeholder="Buscar estudiante"
              />
            </label>
            <label className="form-label">
              Estado de matrícula
              <select name="state" className="form-input" defaultValue={state}>
                <option value="activa">Activas</option>
                <option value="todos">Todas</option>
                <option value="suspendida">Suspendidas</option>
                <option value="abandonada">Abandonadas</option>
                <option value="cancelada">Canceladas</option>
              </select>
            </label>
            <label className="form-label">
              Avance
              <select name="stage" className="form-input" defaultValue={stage}>
                <option value="todos">Todos los avances</option>
                <option value="sin_iniciar">Sin lecciones completadas</option>
                <option value="en_curso">En progreso</option>
                <option value="completado">Lecciones completadas</option>
                <option value="sin_actividad">Sin avance en 14 días</option>
                <option value="sin_cobertura">Sin cobertura vigente</option>
                <option value="sin_contenido">Sin contenido publicado</option>
              </select>
            </label>
          </>
        )}
        <button className="button button-primary">
          {role === "administrador" && !courseId
            ? "Ver estudiantes"
            : "Aplicar filtros"}
        </button>
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2 xl:col-span-4">
          <Link className="text-link text-sm" href={base}>
            Limpiar filtros
          </Link>
          {courseId && (
            <span className="rounded-full bg-brand-soft px-3 py-1 text-sm text-brand">
              Una materia seleccionada ·{" "}
              <Link className="underline" href={base}>
                Cambiar materia
              </Link>
            </span>
          )}
        </div>
      </form>
      <p className="mb-5 max-w-4xl text-sm leading-6 text-muted">
        El porcentaje refleja lecciones que el estudiante marcó como completadas
        entre las publicadas. No equivale a una nota ni a la aprobación del
        curso. La alerta de 14 días indica ausencia de avance registrado y
        orienta el acompañamiento.
      </p>
      {role === "administrador" && !courseId ? (
        <p className="ui-card p-8 text-muted">
          Selecciona arriba la materia y pulsa Ver estudiantes para ver sus
          estudiantes.
        </p>
      ) : !result.data ? (
        <PortalUnavailable />
      ) : (
        <>
          <ProgressStudents
            items={result.data.items}
            role={role}
            timeZone={user.timeZone}
          />
          <nav
            aria-label="Paginación de estudiantes"
            className="mt-6 flex flex-wrap gap-3"
          >
            {cursor && (
              <Link className="button button-secondary" href={firstPage}>
                Primera página
              </Link>
            )}
            {result.data.nextCursor && (
              <Link
                className="button button-secondary"
                href={`${base}?${pagination}`}
              >
                Más estudiantes →
              </Link>
            )}
          </nav>
        </>
      )}
    </>
  );
}

import { PortalSearch } from "@/features/portal/portal-ui";
import Link from "next/link";

const states = ["todos", "aprobado", "pendiente", "rechazado", "suspendido"];
const kinds = ["todos", "estudiante", "docente"];

export function peopleFilters(state?: string, kind?: string) {
  return {
    state: states.includes(state ?? "") ? state! : "todos",
    kind: kinds.includes(kind ?? "") ? kind! : "todos",
  };
}

export function PeopleSearch({
  q,
  state,
  kind,
  teacherOnly = false,
}: {
  q: string;
  state: string;
  kind: string;
  teacherOnly?: boolean;
}) {
  return (
    <section aria-label="Filtros de personas" className="ui-card mb-5 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Buscar y filtrar</h2>
          <p className="mt-1 text-sm text-muted">
            Aplica los filtros antes de descargar el Excel.
          </p>
        </div>
        {(q || state !== "todos" || (!teacherOnly && kind !== "todos")) && (
          <Link
            href={`/portal/administrador/${teacherOnly ? "docentes" : "usuarios"}`}
            className="text-link inline-flex min-h-11 items-center text-sm"
          >
            Limpiar filtros
          </Link>
        )}
      </div>
      <PortalSearch q={q} placeholder="Nombre, apellido o correo electrónico">
        <label className="form-label">
          Estado de cuenta
          <select name="state" defaultValue={state} className="form-input">
            <option value="todos">Todos los estados</option>
            <option value="aprobado">Aprobadas</option>
            <option value="pendiente">Pendientes</option>
            <option value="rechazado">Rechazadas</option>
            <option value="suspendido">Suspendidas</option>
          </select>
        </label>
        {!teacherOnly && (
          <label className="form-label">
            Perfil
            <select name="kind" defaultValue={kind} className="form-input">
              <option value="todos">Todos los perfiles</option>
              <option value="estudiante">Estudiantes</option>
              <option value="docente">Docentes</option>
            </select>
          </label>
        )}
      </PortalSearch>
    </section>
  );
}

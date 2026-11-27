import { PortalSearch } from "@/features/portal/portal-ui";

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
  );
}

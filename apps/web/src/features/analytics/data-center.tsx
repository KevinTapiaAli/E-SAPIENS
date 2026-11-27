import Link from "next/link";
import type {
  DataCenterCell,
  DataCenterColumn,
  DataCenterIndicator,
  DataCenterResult,
  SessionUser,
} from "@esapiens/contracts";
import { readPrivateApi } from "@/features/auth/server";
import {
  PortalHeading,
  PortalUnavailable,
  StatusBadge,
} from "@/features/portal/portal-ui";
import { DashboardRefresh } from "@/features/portal/dashboard-refresh";
import { formatAccountDate } from "@/features/auth/format-date";
import { StatePanel } from "@/shared/ui/state-panel";
import { isDataCenterResult } from "./data-center-validation";
import { DataCenterExportButton } from "./data-center-export";
import { DataBars, DataDonut, DataTrend } from "./data-center-charts";

const base = "/portal/administrador/datos";
const views = {
  overview: "Resumen general",
  students: "Estudiantes",
  courses: "Cursos",
  teachers: "Docentes",
  traffic: "Actividad web",
  reports: "Reportes y exportaciones",
};
const indicators: Record<DataCenterIndicator, string> = {
  students: "Estudiantes y matrículas",
  courses: "Cursos",
  teachers: "Docentes",
  requests: "Solicitudes de inscripción",
  traffic: "Tráfico diario",
};
const number = new Intl.NumberFormat("es-BO");
const pct = (n: number, d: number) =>
  d ? `${number.format(Math.round((1000 * n) / d) / 10)} %` : "Sin datos";
type Filters = Record<string, string | string[] | undefined>;
const recommendationLabels: Record<string, string> = {
  pendingSubmissions: "Entregas sin calificar",
  inactiveStudents: "Estudiantes sin actividad durante al menos 14 días",
  unassignedCourses: "Materias publicadas sin docente habilitado",
  withoutCoverage: "Matrículas activas sin cobertura",
  pendingRequests: "Solicitudes de inscripción pendientes",
  "activeParticipants / previousParticipants":
    "Disminución porcentual de participación registrada",
};

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | string | null;
  detail: string;
}) {
  return (
    <article className="ui-card p-5">
      <h2 className="text-sm font-medium text-muted">{label}</h2>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
        {value === null
          ? "—"
          : typeof value === "number"
            ? number.format(value)
            : value}
      </p>
      <p className="mt-3 text-xs leading-6 text-muted">{detail}</p>
    </article>
  );
}

function Cell({
  value,
  column,
  timeZone,
}: {
  value: DataCenterCell | undefined;
  column: DataCenterColumn;
  timeZone: string;
}) {
  if (value === null || value === undefined)
    return <span className="text-muted">Sin datos</span>;
  if (column.unit === "date" && typeof value === "string")
    return <time dateTime={value}>{formatAccountDate(value, timeZone)}</time>;
  if (column.unit === "boolean") return <span>{value ? "Sí" : "No"}</span>;
  if (column.key === "state" && typeof value === "string")
    return <StatusBadge status={value} />;
  return (
    <>
      {typeof value === "number"
        ? `${number.format(value)}${column.unit === "percent" ? " %" : ""}`
        : String(value)}
    </>
  );
}

function ResultsTable({
  data,
  user,
  query,
}: {
  data: DataCenterResult;
  user: SessionUser;
  query: URLSearchParams;
}) {
  const link = (key: string, value: string) => {
    const next = new URLSearchParams(query);
    next.set(key, value);
    if (key !== "page") next.set("page", "1");
    return `${base}?${next}`;
  };
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <section className="mt-6" aria-labelledby="data-results">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="data-results" className="text-xl font-semibold">
            {indicators[data.indicator]}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {number.format(data.total)} registros · página {data.page} de{" "}
            {pages}
            {data.indicator === "students"
              ? " · una fila por matrícula; un estudiante puede aparecer en varias materias"
              : ""}
          </p>
        </div>
        <DataCenterExportButton
          query={new URLSearchParams(
            [...query].filter(([key]) => key !== "view"),
          ).toString()}
        />
      </div>
      {!data.items.length ? (
        <StatePanel
          title="Sin registros en esta consulta"
          description="Prueba otra materia, estado o nivel de avance. No se han agregado datos de ejemplo."
        />
      ) : (
        <div className="ui-card overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <caption className="sr-only">
              {indicators[data.indicator]}; fechas de registros en{" "}
              {user.timeZone}. Días de tráfico agrupados en UTC.
            </caption>
            <thead className="border-b border-line bg-surface-soft text-muted">
              <tr>
                <th scope="col" className="px-5 py-4 font-medium">
                  <Link className="text-link" href={link("sort", "name")}>
                    {data.indicator === "traffic" ? "Día UTC" : "Nombre"} ↕
                  </Link>
                </th>
                {data.columns.map((c) => (
                  <th key={c.key} scope="col" className="px-5 py-4 font-medium">
                    {["progress", "students", "pending", "activity"].includes(
                      c.key,
                    ) ? (
                      <Link href={link("sort", c.key)} className="text-link">
                        {c.label} ↕
                      </Link>
                    ) : (
                      c.label
                    )}
                  </th>
                ))}
                <th scope="col" className="px-5 py-4 font-medium">
                  Acceso relacionado
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <th scope="row" className="max-w-64 px-5 py-4 font-medium">
                    {row.label}
                  </th>
                  {data.columns.map((c) => (
                    <td key={c.key} className="max-w-72 px-5 py-4">
                      <Cell
                        value={row.values[c.key]}
                        column={c}
                        timeZone={user.timeZone}
                      />
                    </td>
                  ))}
                  <td className="min-w-48 px-5 py-4">
                    {data.indicator === "students" &&
                    user.permissions.includes("academic.read") ? (
                      <Link
                        className="text-link inline-flex min-h-11 items-center"
                        href={`/portal/administrador/seguimiento/${row.id}`}
                      >
                        Abrir expediente →
                      </Link>
                    ) : data.indicator === "teachers" ? (
                      row.courses.length ? (
                        <ul className="space-y-2">
                          {row.courses.map((c) => (
                            <li key={c.id}>
                              <Link
                                className="text-link inline-flex min-h-11 items-center"
                                href={`/portal/administrador/cursos/${c.id}`}
                              >
                                {c.title} →
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted">
                          Sin materias asignadas
                        </span>
                      )
                    ) : row.courseId ? (
                      <Link
                        className="text-link inline-flex min-h-11 items-center"
                        href={`/portal/administrador/cursos/${row.courseId}`}
                      >
                        Abrir materia →
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav
        aria-label="Paginación de resultados"
        className="mt-5 flex flex-wrap items-center gap-3"
      >
        {data.page > 1 && (
          <Link
            className="button button-secondary"
            href={link("page", String(data.page - 1))}
          >
            ← Anterior
          </Link>
        )}
        {data.page < pages && (
          <Link
            className="button button-secondary"
            href={link("page", String(data.page + 1))}
          >
            Siguiente →
          </Link>
        )}
        <span className="text-xs text-muted">
          Hasta {data.pageSize} registros por página · orden:{" "}
          {query.get("sort")}{" "}
          {query.get("direction") === "desc" ? "descendente" : "ascendente"}
        </span>
      </nav>
    </section>
  );
}

function Analysis({
  data,
  query,
}: {
  data: DataCenterResult;
  query: URLSearchParams;
}) {
  return (
    <section className="mt-7 rounded-2xl border border-line bg-brand-soft p-5 sm:p-6">
      <h2 className="text-xl font-semibold">Análisis y recomendaciones</h2>
      <p className="mt-2 text-sm text-muted">
        Reglas descriptivas basadas en los indicadores de esta consulta. Cada
        sugerencia indica qué dato la origina.
      </p>
      {data.recommendations.length ? (
        <ul className="mt-5 grid gap-4 lg:grid-cols-2">
          {data.recommendations.map((r) => {
            const next = new URLSearchParams(query);
            next.set("view", r.target === "requests" ? "reports" : r.target);
            next.set("indicator", r.target);
            next.set("page", "1");
            if (r.indicator === "inactiveStudents") {
              next.set("stage", "sin_actividad");
              next.set("state", "activa");
            }
            if (r.indicator === "withoutCoverage") {
              next.set("stage", "sin_cobertura");
              next.set("state", "activa");
            }
            if (r.indicator === "unassignedCourses")
              next.set("courseState", "publicado");
            if (r.indicator === "pendingSubmissions") {
              next.set("sort", "pending");
              next.set("direction", "desc");
            }
            return (
              <li
                key={r.indicator}
                className="rounded-xl border border-line bg-surface p-4"
              >
                <h3 className="font-semibold">{r.title}</h3>
                <p className="mt-2 text-xs font-medium text-brand">
                  Indicador: {recommendationLabels[r.indicator] ?? r.indicator}{" "}
                  · valor: {number.format(r.value)}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">{r.detail}</p>
                <Link
                  className="text-link mt-2 inline-flex min-h-11 items-center text-sm"
                  href={
                    r.indicator === "pendingRequests"
                      ? "/portal/administrador/inscripciones"
                      : `${base}?${next}`
                  }
                >
                  Consultar detalle →
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-sm">
          Los indicadores consultados no activan prioridades administrativas.
          Esto no constituye una evaluación de desempeño.
        </p>
      )}
    </section>
  );
}

export async function DataCenter({
  filters,
  user,
}: {
  filters: Filters;
  user: SessionUser;
}) {
  const value = (key: string, fallback: string) =>
    typeof filters[key] === "string" ? filters[key] : fallback;
  const view = Object.hasOwn(views, value("view", "overview"))
    ? (value("view", "overview") as keyof typeof views)
    : "overview";
  const indicator =
    view === "overview" || view === "courses"
      ? "courses"
      : view === "reports"
        ? value("indicator", "students")
        : view;
  const query = new URLSearchParams({
    days: value("days", "30"),
    indicator,
    state: value("state", "todos"),
    courseState: value("courseState", "todos"),
    requestState: value("requestState", "todos"),
    stage: value("stage", "todos"),
    page: value("page", "1"),
    pageSize: value("pageSize", "20"),
    sort: value("sort", view === "traffic" ? "activity" : "name"),
    direction: value("direction", "asc"),
  });
  if (value("courseId", "")) query.set("courseId", value("courseId", ""));
  const invalid = Object.values(filters).some(Array.isArray);
  const result = invalid
    ? { status: 400, data: undefined }
    : await readPrivateApi(
        `analytics/data-center?${query}`,
        isDataCenterResult,
      );
  query.set("view", view);
  const data = result.data;
  const measuredTraffic =
    data?.traffic.trend.some((point) => point.visitors !== null) ?? false;
  const s = data?.summary;
  const select = (
    name: string,
    label: string,
    options: Record<string, string>,
    fallback: string,
  ) => (
    <label className="form-label">
      {label}
      <select
        name={name}
        className="form-input"
        defaultValue={value(name, fallback)}
      >
        {Object.entries(options).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <>
      <PortalHeading
        eyebrow="Administración · Datos registrados"
        title="Centro de Datos"
        description="Consulta el estado de la institución, compara materias y prepara reportes para orientar tus decisiones académicas y administrativas."
      />
      <nav
        aria-label="Vistas del Centro de Datos"
        className="mb-6 flex flex-wrap gap-2"
      >
        {Object.entries(views).map(([key, label]) => {
          const next = new URLSearchParams(query);
          next.set("view", key);
          next.set("page", "1");
          if (key === "traffic") {
            next.set("stage", "todos");
            next.set("state", "todos");
            next.set("courseState", "todos");
            next.set("requestState", "todos");
            next.set("sort", "activity");
          }
          return (
            <Link
              key={key}
              href={`${base}?${next}`}
              aria-current={key === view ? "page" : undefined}
              className={`button ${key === view ? "button-primary" : "button-secondary"}`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <form method="get" className="ui-card mb-6 space-y-5 p-5 sm:p-6">
        <input type="hidden" name="view" value={view} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {select(
            "days",
            "Período de actividad",
            {
              "7": "Últimos 7 días completos",
              "30": "Últimos 30 días completos",
              "90": "Últimos 90 días completos",
            },
            "30",
          )}
          <label className="form-label">
            Materia
            <select
              name="courseId"
              className="form-input"
              defaultValue={value("courseId", "")}
            >
              <option value="">Todas las materias</option>
              {data?.courseOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
              {value("courseId", "") &&
                !data?.courseOptions.some(
                  (c) => c.id === value("courseId", ""),
                ) && (
                  <option value={value("courseId", "")}>
                    Materia seleccionada
                  </option>
                )}
            </select>
          </label>
          {view !== "traffic" &&
            select(
              "state",
              "Estado de matrícula",
              {
                todos: "Todos los estados",
                activa: "Activa",
                suspendida: "Suspendida",
                abandonada: "Abandonada registrada",
                cancelada: "Cancelada",
              },
              "todos",
            )}
          {view !== "traffic" &&
            select(
              "stage",
              "Nivel de avance / acceso",
              {
                todos: "Todos los niveles",
                sin_iniciar: "Sin iniciar (0 %)",
                en_curso: "En curso (lecciones pendientes)",
                completado: "Lecciones completadas (100 %)",
                sin_contenido: "Sin lecciones publicadas",
                sin_actividad: "Sin actividad ≥14 días",
                sin_cobertura: "Sin cobertura vigente",
              },
              "todos",
            )}
          {view !== "traffic" &&
            select(
              "courseState",
              "Estado del curso",
              {
                todos: "Todos los cursos",
                publicado: "Publicado",
                borrador: "Borrador",
                revision: "En revisión",
                archivado: "Archivado",
              },
              "todos",
            )}
          {view === "reports" &&
            select("indicator", "Tipo de indicador", indicators, "students")}
          {view === "reports" &&
            select(
              "requestState",
              "Estado de solicitud",
              {
                todos: "Todos",
                pendiente: "Pendiente",
                aprobada: "Aprobada",
                rechazada: "Rechazada",
              },
              "todos",
            )}
          {select(
            "sort",
            "Ordenar por",
            {
              name: "Nombre / día",
              progress: "Avance",
              students: "Estudiantes",
              pending: "Pendientes",
              activity: "Actividad / fecha",
            },
            view === "traffic" ? "activity" : "name",
          )}
          {select(
            "direction",
            "Dirección",
            { asc: "Ascendente", desc: "Descendente" },
            "asc",
          )}
          {select(
            "pageSize",
            "Registros por página",
            { "10": "10", "20": "20", "50": "50", "100": "100" },
            "20",
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="button button-primary">Aplicar filtros</button>
          <Link
            className="button button-secondary"
            href={`${base}?view=${view}`}
          >
            Restablecer
          </Link>
        </div>
        <p className="text-xs leading-6 text-muted">
          El período filtra la actividad y el tráfico; las cuentas, matrículas,
          contenidos y pendientes muestran su estado actual. Los filtros
          académicos delimitan las matrículas y sus materias; el tráfico usa
          período y materia. Los totales de cuentas aprobadas son
          institucionales.
        </p>
        {data?.courseOptionsTruncated && (
          <p className="text-xs text-warning">
            Se muestran las primeras 500 materias en el selector.
          </p>
        )}
      </form>
      {!data ? (
        result.status === 400 ? (
          <StatePanel
            title="Revisa los filtros de consulta"
            description="El período, la materia, la página o uno de los estados no es válido. Restablece los filtros e inténtalo de nuevo."
          />
        ) : result.status === 403 || result.status === 401 ? (
          <StatePanel
            title="Acceso no autorizado"
            description="La sesión necesita un perfil administrativo y permisos para consultar los indicadores académicos."
          />
        ) : (
          <PortalUnavailable />
        )
      ) : (
        <>
          <DashboardRefresh />
          <p className="mb-5 text-xs leading-6 text-muted">
            Consulta: {formatAccountDate(data.generatedAt, user.timeZone)} ·
            zona {user.timeZone}. Actividad: desde{" "}
            {data.period.from.slice(0, 10)} hasta {data.period.to.slice(0, 10)}{" "}
            (exclusivo), en días UTC completos.
          </p>
          {view === "overview" && s && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                  label="Usuarios registrados"
                  value={s.users}
                  detail={`${s.approvedUsers} aprobados · total institucional`}
                />
                <Metric
                  label="Estudiantes aprobados"
                  value={s.approvedStudents}
                  detail="Cuenta aprobada y rol estudiante; actividad reciente se mide por separado."
                />
                <Metric
                  label="Docentes aprobados"
                  value={s.approvedTeachers}
                  detail="Cuenta aprobada y rol docente. No representa horas trabajadas."
                />
                <Metric
                  label="Cursos publicados"
                  value={s.publishedCourses}
                  detail={`${s.draftCourses} borradores · ${s.reviewCourses} en revisión · ${s.archivedCourses} archivados`}
                />
                <Metric
                  label="Matrículas activas"
                  value={s.activeEnrollments}
                  detail={`${s.enrolledStudents} estudiantes únicos en el ámbito consultado`}
                />
                <Metric
                  label="Inscripciones pendientes"
                  value={s.pendingRequests}
                  detail="Solicitudes pendientes actuales; no son matrículas."
                />
                <Metric
                  label="Avance promedio"
                  value={
                    s.averageProgress === null
                      ? null
                      : `${number.format(s.averageProgress)} %`
                  }
                  detail={`Media por matrícula activa con contenido publicado; denominador: ${s.progressDenominator}.`}
                />
                <Metric
                  label="Estudiantes sin actividad ≥14 días"
                  value={s.inactiveStudents}
                  detail="Estudiantes únicos aprobados con matrícula activa. No implica abandono."
                />
                <Metric
                  label="Entregas sin calificar"
                  value={s.pendingSubmissions}
                  detail="Último intento por tarea y matrícula; todos los pendientes actuales."
                />
                <Metric
                  label="Participación registrada"
                  value={s.activeParticipants}
                  detail={`${s.previousParticipants} estudiantes en el período anterior de igual duración.`}
                />
              </div>
              <div className="mt-6 grid gap-5 xl:grid-cols-2">
                <DataDonut
                  title="Estado de los cursos"
                  points={[
                    { label: "Publicados", value: s.publishedCourses },
                    { label: "Borradores", value: s.draftCourses },
                    { label: "En revisión", value: s.reviewCourses },
                    { label: "Archivados", value: s.archivedCourses },
                  ]}
                />
                <DataBars
                  title="Matrículas por materia"
                  points={data.items.slice(0, 10).map((r) => ({
                    label: r.label,
                    value: Number(r.values.enrollments),
                  }))}
                />
              </div>
            </>
          )}
          {view === "students" && s && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                  label="Estudiantes inscritos únicos"
                  value={s.enrolledStudents}
                  detail="Personas distintas en las matrículas filtradas."
                />
                <Metric
                  label="Matrículas activas"
                  value={s.activeEnrollments}
                  detail={`${s.withCoverage} con cobertura · ${s.withoutCoverage} sin cobertura`}
                />
                <Metric
                  label="Avance promedio"
                  value={
                    s.averageProgress === null
                      ? null
                      : `${number.format(s.averageProgress)} %`
                  }
                  detail={`${s.progressDenominator} matrículas activas con contenido publicado.`}
                />
                <Metric
                  label="Estudiantes inactivos ≥14 días"
                  value={s.inactiveStudents}
                  detail="Lecciones, entregas y asistencia confirmada registradas."
                />
              </div>
              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                <DataBars
                  title="Distribución por materia"
                  unit="estudiantes únicos"
                  note="primeras 10 materias por nombre; todos los resultados filtrados"
                  points={data.courseComparison.map((c) => ({
                    label: c.title,
                    value: c.students,
                  }))}
                />
                <DataBars
                  title="Avance promedio por materia"
                  maximum={100}
                  unit="porcentaje"
                  note="primeras 10 materias por nombre; matrículas filtradas con contenido"
                  points={data.courseComparison.map((c) => ({
                    label: c.title,
                    value: c.averageProgress,
                  }))}
                />
                <DataDonut
                  title="Estado de solicitudes de inscripción"
                  points={[
                    { label: "Pendientes", value: data.requestStates.pending },
                    { label: "Aprobadas", value: data.requestStates.approved },
                    { label: "Rechazadas", value: data.requestStates.rejected },
                  ]}
                />
                <DataDonut
                  title="Cobertura de matrículas activas"
                  points={[
                    { label: "Con cobertura vigente", value: s.withCoverage },
                    {
                      label: "Sin cobertura vigente",
                      value: s.withoutCoverage,
                    },
                  ]}
                />
                <section className="ui-card p-5">
                  <h2 className="text-lg font-semibold">Consulta académica</h2>
                  <p className="mt-3 text-sm leading-7 text-muted">
                    La tabla permite abrir el expediente autorizado de cada
                    matrícula. El avance usa lecciones y módulos publicados.
                    Tener cobertura indica al menos un módulo publicado con
                    autorización vigente; otros requisitos del aula pueden
                    limitar el acceso.
                  </p>
                  <Link
                    className="text-link mt-4 inline-flex min-h-11 items-center"
                    href={`${base}?view=reports&indicator=requests&days=${data.period.days}`}
                  >
                    Consultar estados de inscripción →
                  </Link>
                </section>
              </div>
            </>
          )}
          {view === "courses" && (
            <div className="grid gap-5 xl:grid-cols-2">
              <DataBars
                title="Estudiantes únicos por materia"
                unit="personas"
                points={data.items.slice(0, 10).map((r) => ({
                  label: r.label,
                  value: Number(r.values.students),
                }))}
              />
              <DataBars
                title="Avance promedio por materia"
                maximum={100}
                unit="porcentaje · media de matrículas filtradas con contenido"
                points={data.items.slice(0, 10).map((r) => ({
                  label: r.label,
                  value:
                    typeof r.values.progress === "number"
                      ? r.values.progress
                      : null,
                }))}
              />
            </div>
          )}
          {view === "teachers" && s && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Metric
                  label="Docentes aprobados"
                  value={s.approvedTeachers}
                  detail="Total institucional; la tabla se limita a las asignaciones filtradas."
                />
                <Metric
                  label="Pendientes de revisión"
                  value={s.pendingSubmissions}
                  detail="Una entrega puede corresponder a varios docentes de una materia; no sumar filas docentes."
                />
                <Metric
                  label="Materias sin docente habilitado"
                  value={s.unassignedCourses}
                  detail="Materias publicadas sin docente asignado con cuenta aprobada."
                />
              </div>
              <p className="mt-4 text-sm leading-7 text-muted">
                La participación muestra calificaciones, retroalimentaciones y
                sesiones iniciadas registradas. Estos conteos no miden
                productividad, eficiencia ni horas trabajadas.
              </p>
            </>
          )}
          {view === "traffic" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                  label="Visitantes únicos estimados"
                  value={measuredTraffic ? data.traffic.visitors : null}
                  detail="Navegadores estimados durante el período; no son personas identificadas."
                />
                <Metric
                  label="Consultaron cursos"
                  value={measuredTraffic ? data.traffic.courseVisitors : null}
                  detail="Visitantes estimados del catálogo, oferta o fichas de cursos."
                />
                <Metric
                  label="Solicitudes de cuenta atribuidas"
                  value={
                    measuredTraffic ? data.traffic.accountConversions : null
                  }
                  detail={`${pct(data.traffic.accountConversions, data.traffic.visitors)} · denominador: ${data.traffic.visitors} visitantes.`}
                />
                <Metric
                  label="Solicitudes de inscripción atribuidas"
                  value={
                    measuredTraffic ? data.traffic.enrollmentConversions : null
                  }
                  detail={`${pct(data.traffic.enrollmentConversions, data.traffic.courseVisitors)} · denominador: ${data.traffic.courseVisitors} visitantes de cursos.`}
                />
              </div>
              <p className="my-5 text-sm leading-7 text-muted">
                {!measuredTraffic &&
                  "No hay medición web en los días completos seleccionados. "}
                Medición disponible desde{" "}
                {formatAccountDate(data.trackingSince, user.timeZone)}. Se
                respetan las preferencias de privacidad; no se reconstruyen
                visitas anteriores.{" "}
                {data.trafficComparable
                  ? `Período anterior: ${data.traffic.previousVisitors} visitantes estimados.`
                  : "El período anterior no tiene medición completa; no se interpreta su variación."}{" "}
                Las conversiones cuentan visitantes con una solicitud real
                posterior a su visita; las solicitudes diarias son registros y
                no equivalen a visitantes convertidos.
              </p>
              <div className="grid gap-5 xl:grid-cols-2">
                <DataTrend points={data.traffic.trend} />
                <DataBars
                  title="Cursos consultados"
                  unit="visitantes estimados · hasta 6 cursos"
                  note="ámbito completo filtrado"
                  points={data.traffic.topCourses.map((c) => ({
                    label: c.title,
                    value: c.visitors,
                  }))}
                />
              </div>
              {data.traffic.topCourses.length > 0 && (
                <div className="ui-card mt-5 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <caption className="p-5 text-left font-semibold">
                      Cursos consultados y solicitudes registradas · hasta 6
                      materias
                    </caption>
                    <thead className="border-b border-line bg-surface-soft text-muted">
                      <tr>
                        <th scope="col" className="px-5 py-3">
                          Materia
                        </th>
                        <th scope="col" className="px-5 py-3">
                          Visitantes estimados
                        </th>
                        <th scope="col" className="px-5 py-3">
                          Solicitudes del período
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.traffic.topCourses.map((course) => (
                        <tr
                          key={course.id}
                          className="border-b border-line last:border-0"
                        >
                          <th scope="row" className="px-5 py-3 font-medium">
                            <Link
                              className="text-link inline-flex min-h-11 items-center"
                              href={`${base}?view=traffic&days=${data.period.days}&courseId=${course.id}`}
                            >
                              {course.title} →
                            </Link>
                          </th>
                          <td className="px-5 py-3">
                            {number.format(course.visitors)}
                          </td>
                          <td className="px-5 py-3">
                            {number.format(course.requests)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
          {view === "reports" && (
            <section className="rounded-2xl border border-line bg-brand-soft p-5">
              <h2 className="text-xl font-semibold">
                Reporte de {indicators[data.indicator].toLowerCase()}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                El CSV incluye los resultados de la consulta ordenada, con un
                máximo de 5000 registros. No exporta contraseñas, correos,
                sesiones ni identificadores de visitantes. Los campos sin datos
                permanecen vacíos.
              </p>
            </section>
          )}
          <Analysis data={data} query={query} />
          <ResultsTable data={data} user={user} query={query} />
          <details className="ui-card mt-7 p-5">
            <summary className="text-link min-h-11 cursor-pointer py-2 font-medium">
              Definiciones y límites de los indicadores
            </summary>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-muted">
              <li>
                Avance: lecciones completadas / lecciones publicadas en módulos
                publicados, por matrícula. Sin contenido: sin datos. El promedio
                excluye esos valores y pondera cada matrícula por igual.
              </li>
              <li>
                Cobertura: existe al menos una autorización de módulo publicado,
                no revocada, con inicio inclusivo y vencimiento exclusivo. No
                certifica acceso a todo el temario.
              </li>
              <li>
                Inactividad: al menos 14 días sin actividad académica
                registrada, desde la última actividad o la matrícula. Nunca se
                asigna automáticamente el estado abandonada.
              </li>
              <li>
                Entregas: se considera el último intento por tarea y matrícula.
                Pendientes: estado actual. Entregas y calificaciones del
                período: fecha de entrega y calificación, respectivamente.
              </li>
              <li>
                Cuentas aprobadas: estado administrativo actual, no actividad
                reciente. Estudiantes únicos, matrículas e inscripciones son
                medidas distintas. No sumar estudiantes únicos entre cursos.
              </li>
              <li>
                Tráfico: días UTC y atribución opcional. No se suman visitantes
                diarios para calcular visitantes únicos de todo el período;
                medición parcial y preferencias de privacidad limitan su
                alcance.
              </li>
            </ul>
          </details>
        </>
      )}
    </>
  );
}

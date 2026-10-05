import type { AcademicReport } from "@esapiens/contracts";
import { notFound } from "next/navigation";
import { readPrivateApi } from "@/features/auth/server";
import { portalSession } from "./server";
import { isWorkspaceRole } from "./navigation";
import { PortalHeading, PortalUnavailable } from "./portal-ui";
import { CourseChoice } from "./course-choice";
import { ReportCharts } from "./report-charts";
import { AcademicRecord } from "./academic-record";
import { isRecord } from "@/shared/api/public-api";
import { isProgressPage } from "@/features/progress/server";
import type { ProgressFilters } from "@/features/progress/progress-section";
import { isResourceId } from "@/features/classroom/server";

const topics = {
  avance: "Avance de lecciones",
  tareas: "Puntajes de tareas",
  asistencia: "Asistencia confirmada",
  acceso: "Cobertura de acceso",
};
function isReport(v: unknown): v is AcademicReport {
  if (!isRecord(v)) return false;
  const count = (n: unknown) =>
    typeof n === "number" && Number.isInteger(n) && n >= 0;
  const point = (p: unknown) =>
    isRecord(p) &&
    typeof p.label === "string" &&
    (p.value === null ||
      (typeof p.value === "number" &&
        Number.isFinite(p.value) &&
        p.value >= 0));
  return (
    [v.total, v.students, v.inactive, v.missing].every(count) &&
    (v.average === null ||
      (typeof v.average === "number" && Number.isFinite(v.average))) &&
    Array.isArray(v.bars) &&
    v.bars.every(point) &&
    Array.isArray(v.distribution) &&
    v.distribution.every((p) => point(p) && isRecord(p) && count(p.value)) &&
    Array.isArray(v.timeline) &&
    v.timeline.every((p) => point(p) && isRecord(p) && count(p.value))
  );
}
export default async function MetricsPage({
  params,
  filters = {},
  section = "informes",
}: {
  params: Promise<{ role: string }>;
  filters?: ProgressFilters;
  section?: string;
}) {
  const { role } = await params;
  if (!isWorkspaceRole(role)) notFound();
  await portalSession();
  const topic = Object.hasOwn(topics, filters.topic ?? "")
    ? (filters.topic as keyof typeof topics)
    : undefined;
  const courseId = isResourceId(filters.courseId ?? "")
    ? filters.courseId
    : undefined;
  const state = filters.state === "todos" ? "todos" : "activa";
  const query = new URLSearchParams({
    role,
    state,
    ...(topic ? { topic } : {}),
    ...(courseId ? { courseId } : {}),
  });
  const result = topic
    ? await readPrivateApi(`academic/progress/report?${query}`, isReport)
    : null;
  const recordQuery = new URLSearchParams(query);
  recordQuery.delete("topic");
  if (isResourceId(filters.cursor ?? ""))
    recordQuery.set("cursor", filters.cursor!);
  const record =
    topic && role === "estudiante"
      ? await readPrivateApi(`academic/progress?${recordQuery}`, isProgressPage)
      : null;
  const linkQuery = new URLSearchParams(query);
  linkQuery.delete("role");
  if (recordQuery.has("cursor"))
    linkQuery.set("cursor", recordQuery.get("cursor")!);
  return (
    <>
      <PortalHeading
        eyebrow="Consultas a tu medida"
        title={
          role === "estudiante"
            ? "Mi progreso y cárdex"
            : role === "docente"
              ? "Indicadores de mis materias"
              : "Indicadores de la institución"
        }
        description="Elige qué quieres conocer. Consulta el detalle y decide tu siguiente paso con información registrada en E-SAPIENS."
      />
      <form method="get" className="ui-card mb-7 space-y-5 p-5 sm:p-6">
        <div className="grid items-end gap-5 lg:grid-cols-2">
          <label className="form-label">
            ¿Qué quieres consultar?
            <select
              className="form-input"
              name="topic"
              required
              defaultValue={topic ?? ""}
            >
              <option value="" disabled>
                Elige una consulta
              </option>
              {Object.entries(topics)
                .filter(([key]) => key !== "acceso" || role === "administrador")
                .map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
          <label className="form-label">
            Matrículas incluidas
            <select name="state" className="form-input" defaultValue={state}>
              <option value="activa">Activas</option>
              <option value="todos">Todo el historial</option>
            </select>
          </label>
        </div>
        <CourseChoice role={role} value={courseId} />
        <button className="button button-primary">Consultar información</button>
      </form>
      {!topic ? (
        <section className="rounded-2xl border border-line bg-brand-soft p-8">
          <h2 className="text-xl font-semibold">Tú eliges la información</h2>
          <p className="mt-3 text-muted">
            Verás una comparación por materia, la distribución de resultados y
            la actividad mensual.{" "}
            {role === "estudiante"
              ? "También encontrarás tu cárdex de aprendizaje."
              : "Puedes limitar la consulta a una materia."}
          </p>
        </section>
      ) : !result?.data ? (
        <PortalUnavailable />
      ) : (
        <>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">{topics[topic]}</h2>
            <p className="mt-1 text-sm text-muted">
              {result.data.students} estudiantes · {result.data.total}{" "}
              matrículas · Consulta realizada al abrir este resultado
            </p>
          </div>
          <ReportCharts data={result.data} topic={topic} />
          <section className="mt-5 rounded-2xl border border-line bg-brand-soft p-6">
            <h2 className="font-semibold">Lectura de tu consulta</h2>
            <p className="mt-2 text-sm leading-7">
              {result.data.total
                ? `Promedio del indicador: ${result.data.average === null ? "sin registro" : `${result.data.average} / 100`}. ${result.data.missing} matrículas no tienen datos para calcularlo. El promedio asigna el mismo peso a cada matrícula con registros.`
                : "Todavía no hay matrículas en el alcance elegido."}
            </p>
            <p className="mt-3 text-sm leading-7">
              <strong>Siguiente paso sugerido: </strong>
              {!result.data.total
                ? "Prueba otra materia o consulta todo el historial."
                : result.data.missing
                  ? topic === "tareas"
                    ? "Revisa las entregas pendientes de calificación antes de interpretar el promedio."
                    : topic === "asistencia"
                      ? "Completa o confirma los registros de clase antes de evaluar la asistencia."
                      : "Revisa las materias sin registros para identificar qué información falta."
                  : topic === "avance" && result.data.inactive
                    ? `Hay ${result.data.inactive} matrículas sin avance de lecciones durante 14 días. Prioriza el acompañamiento.`
                    : topic === "acceso" && result.data.average !== 100
                      ? "Consulta las matrículas sin cobertura vigente y revisa sus módulos habilitados."
                      : "Compara las materias y revisa sus resultados individuales para planificar el siguiente objetivo."}
            </p>
          </section>
        </>
      )}
      {role === "estudiante" &&
        topic &&
        (record?.data ? (
          <AcademicRecord
            page={record.data}
            base={`/portal/estudiante/${section}`}
            query={linkQuery}
          />
        ) : (
          <PortalUnavailable />
        ))}
    </>
  );
}

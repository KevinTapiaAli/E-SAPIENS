import Link from "next/link";
import type {
  LearningStage,
  StudentProgress,
  WorkspaceRole,
} from "@esapiens/contracts";
import { ProgressBar } from "@/shared/ui/progress-bar";
import { StatePanel } from "@/shared/ui/state-panel";
import { StatusBadge } from "@/features/portal/portal-ui";
import { formatAccountDate } from "@/features/auth/format-date";

export const stageLabels: Record<LearningStage, string> = {
  sin_contenido: "Sin lecciones publicadas",
  sin_iniciar: "Sin lecciones completadas",
  en_curso: "En progreso",
  completado: "Lecciones completadas",
};

export function LearningProgress({
  progress,
}: {
  progress: Pick<
    StudentProgress,
    "percent" | "totalLessons" | "completedLessons" | "stage"
  >;
}) {
  return (
    <div className="min-w-40 space-y-2">
      {progress.percent === null ? (
        <p className="text-sm text-muted">Sin contenido publicado</p>
      ) : (
        <ProgressBar value={progress.percent} label="Lecciones" />
      )}
      <p className="text-xs text-muted">
        {progress.completedLessons} de {progress.totalLessons} completadas
      </p>
      <p
        className={`text-xs font-medium ${progress.stage === "completado" ? "text-success" : "text-muted"}`}
      >
        {stageLabels[progress.stage]}
      </p>
    </div>
  );
}

export function ProgressStudents({
  items,
  role,
  timeZone,
}: {
  items: StudentProgress[];
  role: WorkspaceRole;
  timeZone: string;
}) {
  if (!items.length)
    return (
      <StatePanel
        title="No hay matrículas que coincidan"
        description={
          role === "docente"
            ? "Prueba otros filtros. Aquí aparecen los estudiantes matriculados en las materias que administración te ha asignado."
            : "Prueba otros filtros o registra una matrícula en Matrículas y acceso."
        }
      />
    );
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="ui-card p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(180px,1fr)_minmax(180px,1fr)]">
            <div className="min-w-0">
              <p className="mb-2 text-xs font-medium text-muted">
                Estudiante · matrícula{" "}
                <StatusBadge status={item.enrollmentStatus} />
              </p>
              <h2 className="text-lg font-semibold break-words">
                <Link
                  href={`/portal/${role}/seguimiento/${item.id}`}
                  className="text-link"
                >
                  {item.student}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-muted break-words">
                {item.course}
              </p>
              {item.accountStatus !== "aprobado" && (
                <p className="mt-2 text-sm text-warning">
                  Cuenta sin acceso aprobado
                </p>
              )}
            </div>
            <LearningProgress progress={item} />
            <div className="text-sm">
              <p className="text-muted">Último avance registrado</p>
              <p className="mt-1 font-medium">
                {item.lastActivityAt
                  ? formatAccountDate(item.lastActivityAt, timeZone)
                  : "Aún sin registros"}
              </p>
              {item.inactive && (
                <p className="mt-2 rounded-lg bg-warning-soft px-3 py-2 text-warning">
                  Sin avance registrado en 14 días
                </p>
              )}
              {!item.hasCoverage && (
                <p className="mt-2 text-warning">
                  Sin cobertura vigente en módulos publicados
                </p>
              )}
            </div>
          </div>
          <dl className="mt-5 grid gap-4 rounded-xl bg-surface-soft p-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">Promedio de tareas / 100</dt>
              <dd className="mt-1 font-semibold">
                {item.taskAverage ?? "Sin calificar"}
              </dd>
              <dd className="text-xs text-muted">
                {item.gradedTasks} tareas calificadas · último intento
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Tareas entregadas</dt>
              <dd className="mt-1 font-semibold">{item.submittedTasks}</dd>
              <dd className="text-xs text-muted">
                {item.submittedTasks - item.gradedTasks} pendientes de
                calificación
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Asistencia confirmada</dt>
              <dd className="mt-1 font-semibold">
                {item.finishedClasses
                  ? `${item.attendedClasses} de ${item.finishedClasses} clases finalizadas`
                  : "Sin clases registradas"}
              </dd>
              <dd className="text-xs text-muted">
                La falta de registro no confirma una ausencia.
              </dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <Link
              className="button button-secondary"
              href={`/portal/${role}/seguimiento/${item.id}`}
            >
              Ver avance por módulo
            </Link>
            {role === "administrador" && (
              <Link
                className="text-link inline-flex min-h-11 items-center text-sm"
                href={`/portal/administrador/matriculas/${item.id}`}
              >
                Gestionar matrícula y acceso
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

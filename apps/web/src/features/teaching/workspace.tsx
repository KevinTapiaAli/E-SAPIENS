import Link from "next/link";
import { notFound } from "next/navigation";
import type { SessionUser, WorkspaceRole } from "@esapiens/contracts";
import { readPrivateApi } from "@/features/auth/server";
import {
  PortalHeading,
  PortalSearch,
  PortalPagination,
  PortalUnavailable,
  StatusBadge,
} from "@/features/portal/portal-ui";
import { StatePanel } from "@/shared/ui/state-panel";
import { formatAccountDate } from "@/features/auth/format-date";
import {
  isMaterials,
  isTasks,
  isTeachingCourse,
  isTeachingTask,
  isSubmissions,
} from "./server";
import {
  FeedbackForm,
  GradeForm,
  MaterialEditor,
  SubmitTaskForm,
  TaskEditor,
} from "./forms";

export function CourseWorkspaceLinks({
  role,
  id,
}: {
  role: WorkspaceRole;
  id: string;
}) {
  return (
    <nav
      aria-label="Apartados de la materia"
      className="mb-7 flex flex-wrap gap-3"
    >
      <Link
        className="button button-secondary"
        href={`/portal/${role}/cursos/${id}`}
      >
        Materia
      </Link>
      <Link
        className="button button-secondary"
        href={`/portal/${role}/cursos/${id}/materiales`}
      >
        Materiales y referencias
      </Link>
      <Link
        className="button button-secondary"
        href={`/portal/${role}/cursos/${id}/tareas`}
      >
        Tareas y entregas
      </Link>
      {role !== "estudiante" && (
        <Link
          className="button button-secondary"
          href={`/portal/${role}/seguimiento?courseId=${id}`}
        >
          Consultar estudiantes
        </Link>
      )}
    </nav>
  );
}
export async function TeacherCourse({ id }: { id: string }) {
  const result = await readPrivateApi(
    `academic/teaching/${id}?role=docente`,
    isTeachingCourse,
  );
  if (result.status === 404 || result.status === 403) notFound();
  if (!result.data) return <PortalUnavailable />;
  return (
    <>
      <PortalHeading
        eyebrow="Mi materia"
        title={result.data.title}
        description="Selecciona lo que necesitas gestionar en esta materia."
      />
      <CourseWorkspaceLinks role="docente" id={id} />
      <section className="ui-card p-6">
        <h2 className="text-xl font-semibold">Preparación y acompañamiento</h2>
        <p className="mt-3 text-muted">
          En Materiales puedes publicar y editar apoyos, contenidos y enlaces.
          En Tareas defines los trabajos y respondes a las entregas de tus
          estudiantes.
        </p>
        <Link
          className="button button-primary mt-5"
          href="/portal/docente/inscripciones"
        >
          Revisar solicitudes de inscripción
        </Link>
      </section>
    </>
  );
}
export async function TeachingWorkspace({
  role,
  courseId,
  section,
  user,
  cursor,
  q = "",
}: {
  role: WorkspaceRole;
  courseId: string;
  section: "materiales" | "tareas";
  user: SessionUser;
  cursor?: string;
  q?: string;
}) {
  const root = `academic/teaching/${courseId}`;
  const query = new URLSearchParams({ role, q, ...(cursor ? { cursor } : {}) });
  const course = await readPrivateApi(`${root}?role=${role}`, isTeachingCourse);
  if (course.status === 404 || course.status === 403) notFound();
  if (!course.data) return <PortalUnavailable />;
  const editor =
    role === "docente" && user.permissions.includes("teaching.manage");
  const base = `/portal/${role}/cursos/${courseId}/${section}`;
  if (section === "materiales") {
    const result = await readPrivateApi(
      `${root}/materials?${query}`,
      isMaterials,
    );
    return (
      <>
        <PortalHeading
          eyebrow={course.data.title}
          title="Materiales y referencias"
          description="Apoyos, contenido para avanzar y enlaces organizados por módulo."
        />
        <CourseWorkspaceLinks role={role} id={courseId} />
        <PortalSearch
          q={q}
          placeholder="Buscar material por título, módulo o contenido"
        />
        {editor && (
          <div className="mb-6">
            <MaterialEditor courseId={courseId} modules={course.data.modules} />
          </div>
        )}
        {!result.data ? (
          <PortalUnavailable />
        ) : (
          <>
            {!result.data.items.length && (
              <StatePanel
                title="No hay materiales disponibles"
                description={
                  role === "estudiante"
                    ? "Aquí verás los materiales publicados de los módulos a los que tienes acceso."
                    : "Añade un material y elige cuándo publicarlo."
                }
              />
            )}
            <div className="space-y-5">
              {result.data.items.map((material) => (
                <article key={material.id} className="ui-card p-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                    {material.module} ·{" "}
                    {material.kind === "apoyo"
                      ? "Apoyo"
                      : material.kind === "contenido"
                        ? "Contenido para avanzar"
                        : "Referencia"}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    {material.title}
                  </h2>
                  {role !== "estudiante" && (
                    <div className="mt-3">
                      <StatusBadge
                        status={material.published ? "publicado" : "borrador"}
                      />
                    </div>
                  )}
                  {material.content && (
                    <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7">
                      {material.content}
                    </p>
                  )}
                  {material.url?.startsWith("https://") && (
                    <a
                      className="button button-secondary mt-4"
                      href={material.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Abrir recurso ↗
                    </a>
                  )}
                  {editor && (
                    <div className="mt-5">
                      <MaterialEditor
                        key={material.revision}
                        courseId={courseId}
                        modules={course.data!.modules}
                        material={material}
                      />
                    </div>
                  )}
                </article>
              ))}
            </div>
            <PortalPagination
              base={base}
              q={q}
              cursor={cursor}
              next={result.data.nextCursor}
            />
          </>
        )}
      </>
    );
  }
  const result = await readPrivateApi(`${root}/tasks?${query}`, isTasks);
  return (
    <>
      <PortalHeading
        eyebrow={course.data.title}
        title="Tareas y entregas"
        description={
          role === "estudiante"
            ? "Consulta las indicaciones, envía tu trabajo con un comentario y lee la respuesta del docente."
            : "Organiza tareas por módulo y revisa los trabajos y comentarios de los estudiantes."
        }
      />
      <CourseWorkspaceLinks role={role} id={courseId} />
      {editor && (
        <div className="mb-6">
          <TaskEditor courseId={courseId} modules={course.data.modules} />
        </div>
      )}
      {!result.data ? (
        <PortalUnavailable />
      ) : (
        <>
          {!result.data.items.length && (
            <StatePanel
              title="No hay tareas disponibles"
              description={
                role === "estudiante"
                  ? "Las tareas publicadas aparecerán cuando tengas acceso a su módulo."
                  : "Crea una tarea con indicaciones, plazo y número de intentos."
              }
            />
          )}
          <ul className="space-y-4">
            {result.data.items.map((task) => (
              <li key={task.id} className="ui-card p-6">
                <p className="text-sm text-brand">{task.module}</p>
                <h2 className="mt-2 text-xl font-semibold">{task.title}</h2>
                <p className="mt-3 text-sm text-muted">
                  Fecha límite: {formatAccountDate(task.dueAt, user.timeZone)} ·{" "}
                  {task.maxSubmissions} intentos ·{" "}
                  {task.allowLate
                    ? "Acepta entregas tardías"
                    : "Sin entregas fuera de plazo"}
                </p>
                {role !== "estudiante" && (
                  <div className="mt-3">
                    <StatusBadge
                      status={task.published ? "publicado" : "borrador"}
                    />
                  </div>
                )}
                <Link
                  className="button button-primary mt-5"
                  href={`${base}/${task.id}`}
                >
                  {role === "estudiante"
                    ? "Abrir tarea y entregar"
                    : "Abrir tarea y revisar entregas"}
                </Link>
              </li>
            ))}
          </ul>
          <PortalPagination
            base={base}
            cursor={cursor}
            next={result.data.nextCursor}
          />
        </>
      )}
    </>
  );
}
export async function TaskWorkspace({
  role,
  courseId,
  taskId,
  user,
  cursor,
}: {
  role: WorkspaceRole;
  courseId: string;
  taskId: string;
  user: SessionUser;
  cursor?: string;
}) {
  const root = `academic/teaching/${courseId}`;
  const query = new URLSearchParams({ role, ...(cursor ? { cursor } : {}) });
  const [course, task, submissions] = await Promise.all([
    readPrivateApi(`${root}?role=${role}`, isTeachingCourse),
    readPrivateApi(`${root}/tasks/${taskId}?role=${role}`, isTeachingTask),
    readPrivateApi(
      `${root}/tasks/${taskId}/submissions?${query}`,
      isSubmissions,
    ),
  ]);
  if (task.status === 404 || task.status === 403) notFound();
  if (!task.data || !course.data) return <PortalUnavailable />;
  const t = task.data;
  const editor =
    role === "docente" && user.permissions.includes("teaching.manage");
  const open = t.allowLate || Date.now() <= Date.parse(t.dueAt);
  const base = `/portal/${role}/cursos/${courseId}/tareas/${taskId}`;
  return (
    <>
      <PortalHeading
        eyebrow={course.data.title}
        title={t.title}
        description={t.module}
      />
      <CourseWorkspaceLinks role={role} id={courseId} />
      <section className="ui-card mb-6 p-6">
        <h2 className="text-lg font-semibold">Indicaciones</h2>
        <p className="mt-3 whitespace-pre-wrap break-words leading-7">
          {t.instructions}
        </p>
        <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
          Fecha límite: {formatAccountDate(t.dueAt, user.timeZone)} (
          {user.timeZone}) · {t.maxSubmissions} intentos ·{" "}
          {t.allowLate
            ? "Se aceptan entregas tardías"
            : "Sin entregas fuera de plazo"}
        </p>
      </section>
      {editor && (
        <div className="mb-6">
          <TaskEditor
            key={t.revision}
            courseId={courseId}
            modules={course.data.modules}
            task={t}
          />
        </div>
      )}
      {role === "estudiante" &&
        (open && t.submissionCount < t.maxSubmissions ? (
          <div className="mb-7">
            <SubmitTaskForm courseId={courseId} taskId={taskId} />
          </div>
        ) : (
          <p className="mb-7 rounded-xl bg-surface-soft p-5 text-sm">
            {!open
              ? "El plazo de entrega ha terminado."
              : "Ya utilizaste todos los intentos disponibles."}{" "}
            Puedes consultar los envíos que realizaste.
          </p>
        ))}
      <h2 className="mb-4 text-xl font-semibold">
        {role === "estudiante"
          ? "Mis entregas y comentarios"
          : "Entregas de estudiantes"}
      </h2>
      {!submissions.data ? (
        <PortalUnavailable />
      ) : (
        <>
          {!submissions.data.items.length && (
            <StatePanel
              title="Sin entregas en esta página"
              description="Los trabajos enviados aparecerán aquí junto a sus comentarios."
            />
          )}
          <div className="space-y-5">
            {submissions.data.items.map((submission) => (
              <article key={submission.id} className="ui-card p-6">
                <h3 className="font-semibold">
                  {submission.student} · Intento {submission.attempt}
                </h3>
                <p className="mt-1 text-xs text-muted">
                  Enviado:{" "}
                  {formatAccountDate(submission.submittedAt, user.timeZone)}
                  {Date.parse(submission.submittedAt) > Date.parse(t.dueAt)
                    ? " · Fuera de plazo"
                    : ""}
                </p>
                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7">
                  {submission.text}
                </p>
                {submission.url?.startsWith("https://") && (
                  <a
                    href={submission.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button button-secondary mt-3"
                  >
                    Abrir trabajo ↗
                  </a>
                )}
                {submission.comment && (
                  <div className="mt-4 rounded-xl bg-brand-soft p-4">
                    <p className="text-xs font-semibold text-brand">
                      Comentario del estudiante
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                      {submission.comment}
                    </p>
                  </div>
                )}
                <p className="mt-4 font-semibold">
                  Calificación:{" "}
                  {submission.grade === null
                    ? "Pendiente"
                    : `${submission.grade}/100`}
                </p>
                {editor && (
                  <GradeForm
                    key={`${submission.id}-${submission.grade}`}
                    grade={submission.grade}
                    path={`teaching/${courseId}/tasks/${taskId}/submissions/${submission.id}/grade`}
                  />
                )}
                {submission.feedback.map((f) => (
                  <div
                    key={f.id}
                    className="mt-4 rounded-xl bg-surface-soft p-4"
                  >
                    <p className="text-sm font-semibold">
                      Respuesta de {f.teacher}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatAccountDate(f.createdAt, user.timeZone)}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                      {f.comment}
                    </p>
                  </div>
                ))}
                {editor && (
                  <FeedbackForm
                    path={`teaching/${courseId}/tasks/${taskId}/submissions/${submission.id}/feedback`}
                  />
                )}
              </article>
            ))}
          </div>
          <PortalPagination
            base={base}
            cursor={cursor}
            next={submissions.data.nextCursor}
          />
        </>
      )}
    </>
  );
}

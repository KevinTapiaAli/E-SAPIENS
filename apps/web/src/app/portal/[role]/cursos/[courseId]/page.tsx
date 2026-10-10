import Link from "next/link";
import { notFound } from "next/navigation";
import { portalSession } from "@/features/portal/server";
import { readPrivateApi } from "@/features/auth/server";
import { formatAccessTime } from "@/features/classroom/format-time";
import {
  PortalHeading,
  PortalUnavailable,
  StatusBadge,
} from "@/features/portal/portal-ui";
import { isClassroomCourse, isResourceId } from "@/features/classroom/server";
import { Icon } from "@/shared/ui/icon";
import { ProgressBar } from "@/shared/ui/progress-bar";
import { ManageCourse } from "@/features/management/manage-course";
import {
  CourseWorkspaceLinks,
  TeacherCourse,
} from "@/features/teaching/workspace";

export default async function ClassroomCoursePage({
  params,
}: {
  params: Promise<{ role: string; courseId: string }>;
}) {
  const { role, courseId } = await params;
  if (
    !["estudiante", "administrador", "docente"].includes(role) ||
    !isResourceId(courseId)
  )
    notFound();
  const user = await portalSession();
  if (role === "docente") return <TeacherCourse id={courseId} />;
  if (role === "administrador")
    return (
      <ManageCourse
        id={courseId}
        canEdit={user.permissions.includes("academic.edit")}
      />
    );
  const result = await readPrivateApi(
    `academic/classroom/${courseId}`,
    isClassroomCourse,
  );
  if (result.status === 404) notFound();
  if (!result.data) return <PortalUnavailable />;
  const course = result.data;
  const lessons = course.modules.flatMap((module) => module.lessons);
  const completed = lessons.filter((lesson) => lesson.completed).length;
  const next = course.modules
    .filter((module) => module.available)
    .flatMap((module) => module.lessons)
    .find((lesson) => !lesson.completed);
  return (
    <>
      <Link
        href="/portal/estudiante/cursos"
        className="text-link mb-6 inline-flex min-h-11 items-center"
      >
        ← Mis cursos
      </Link>
      <PortalHeading
        eyebrow="Mi aula"
        title={course.title}
        description="Consulta tu acceso, abre una lección y continúa desde donde te quedaste."
      />
      <CourseWorkspaceLinks role="estudiante" id={courseId} />
      <div className="ui-card mb-8 grid items-center gap-6 p-6 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="mb-4">
            <StatusBadge status={course.enrollmentStatus} />
          </div>
          <ProgressBar
            label="Tu avance en lecciones"
            value={
              lessons.length
                ? Math.round((completed / lessons.length) * 100)
                : 0
            }
          />
          <p className="mt-2 text-sm text-muted">
            {completed} de {lessons.length} lecciones completadas
          </p>
        </div>
        {next && (
          <Link
            className="button button-primary"
            href={`/portal/estudiante/cursos/${course.id}/lecciones/${next.id}`}
          >
            {completed ? "Continuar estudiando" : "Comenzar a estudiar"}
            <Icon name="arrow" />
          </Link>
        )}
      </div>
      {course.requiresExam && (
        <p className="mb-6 rounded-xl border border-line bg-surface-soft p-5 text-sm text-muted">
          Esta materia exige evaluaciones para avanzar entre módulos. Completar
          las lecturas no sustituye ese requisito. Consulta al docente si el
          siguiente módulo sigue bloqueado.
        </p>
      )}
      {!course.modules.length && (
        <p className="ui-card p-6 text-muted">
          La materia todavía no tiene módulos publicados.
        </p>
      )}
      <div className="space-y-6">
        {course.modules.map((module, index) => (
          <section key={module.id} className="ui-card overflow-hidden">
            <div className="border-b border-line bg-surface-soft p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                Módulo {index + 1} ·{" "}
                {module.available ? "Disponible" : "Bloqueado"}
              </p>
              <h2 className="mt-2 text-xl font-semibold">{module.title}</h2>
              <p className="mt-2 text-sm text-muted">{module.description}</p>
              <p
                className={`mt-4 text-sm font-medium ${module.available ? "text-success" : "text-muted"}`}
              >
                {module.accessReason}
              </p>
              {module.accessUntil && (
                <p className="mt-2 text-xs text-muted">
                  Autorización vigente hasta{" "}
                  {formatAccessTime(module.accessUntil, user.timeZone)} (
                  {user.timeZone}).
                </p>
              )}
            </div>
            <ul className="divide-y divide-line">
              {module.lessons.map((lesson) => (
                <li
                  key={lesson.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-5"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{lesson.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      {lesson.type} · {lesson.durationMinutes} min ·{" "}
                      {lesson.completed ? "Completada" : "Por completar"}
                    </p>
                  </div>
                  {module.available ? (
                    <Link
                      href={`/portal/estudiante/cursos/${course.id}/lecciones/${lesson.id}`}
                      className="button button-secondary"
                    >
                      {lesson.completed ? "Repasar" : "Abrir lección"}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted">Acceso bloqueado</span>
                  )}
                </li>
              ))}
            </ul>
            {!module.lessons.length && (
              <p className="p-6 text-sm text-muted">
                Todavía no hay lecciones publicadas en este módulo.
              </p>
            )}
          </section>
        ))}
      </div>
    </>
  );
}

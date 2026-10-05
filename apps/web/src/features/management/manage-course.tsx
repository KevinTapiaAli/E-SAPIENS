import Link from "next/link";
import { notFound } from "next/navigation";
import { readPrivateApi } from "@/features/auth/server";
import {
  PortalHeading,
  PortalUnavailable,
  StatusBadge,
} from "@/features/portal/portal-ui";
import { isManagedCourse } from "./server";
import { CourseEditor, ModuleEditor, LessonEditor } from "./editor-forms";
import { CourseWorkspaceLinks } from "@/features/teaching/workspace";

export async function ManageCourse({
  id,
  canEdit,
}: {
  id: string;
  canEdit: boolean;
}) {
  const result = await readPrivateApi(
    `academic/management/courses/${id}`,
    isManagedCourse,
  );
  if (result.status === 404) notFound();
  if (!result.data) return <PortalUnavailable />;
  const course = result.data;
  return (
    <>
      <Link
        href="/portal/administrador/cursos"
        className="text-link mb-6 inline-flex min-h-11 items-center"
      >
        ← Cursos y docentes
      </Link>
      <PortalHeading
        eyebrow="Administración académica"
        title={course.title}
        description="Gestiona los datos, los requisitos y el contenido que estudian tus alumnos."
      />
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <StatusBadge status={course.status} />
        <p className="text-sm text-muted">
          {course.modules.length} módulos ·{" "}
          {course.modules.reduce((sum, m) => sum + m.lessons.length, 0)}{" "}
          lecciones
        </p>
      </div>
      {!canEdit && (
        <p className="mb-5 rounded-xl bg-surface-soft p-5 text-muted">
          Tu perfil puede consultar este contenido, pero no tiene permiso de
          edición.
        </p>
      )}
      <CourseWorkspaceLinks role="administrador" id={id} />
      <details className="ui-card p-6" open={!course.modules.length}>
        <summary className="cursor-pointer py-2 text-xl font-semibold">
          Datos y publicación de la materia
        </summary>
        <div className="mt-6">
          <CourseEditor course={course} canEdit={canEdit} />
        </div>
      </details>
      <section className="mt-8 space-y-5">
        <h2 className="text-2xl font-semibold">Temario y contenido</h2>
        <p className="text-sm text-muted">
          Prepara los módulos y las lecciones, publica el contenido y después
          publica la materia. La asignación de docentes se mantiene en Cursos y
          docentes.
        </p>
        {course.enrolled && (
          <p className="rounded-xl border border-line bg-surface-soft p-4 text-sm text-muted">
            Hay alumnos matriculados. Puedes corregir textos y disponibilidad;
            para cambiar la estructura o los requisitos, crea una nueva edición
            como otra materia.
          </p>
        )}
        {course.modules.map((module) => (
          <article key={module.id} className="ui-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-xl font-semibold">
                {module.order}. {module.title}
              </h3>
              <StatusBadge
                status={module.published ? "publicado" : "borrador"}
              />
            </div>
            <p className="mt-3 text-sm text-muted">{module.description}</p>
            <details className="mt-4 rounded-xl border border-line p-4">
              <summary className="cursor-pointer py-2 font-medium">
                Editar módulo
              </summary>
              <div className="mt-4">
                <ModuleEditor
                  courseId={id}
                  module={module}
                  enrolled={course.enrolled}
                  canEdit={canEdit}
                />
              </div>
            </details>
            <ul className="mt-5 divide-y divide-line">
              {module.lessons.map((lesson) => (
                <li
                  key={lesson.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <p className="font-medium">
                      {lesson.order}. {lesson.title}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {lesson.type} ·{" "}
                      {lesson.published ? "Publicada" : "Borrador"} ·{" "}
                      {lesson.durationMinutes} min
                    </p>
                  </div>
                  <Link
                    className="button button-secondary"
                    href={`/portal/administrador/cursos/${id}/editar/${lesson.id}`}
                  >
                    {canEdit ? "Editar lección" : "Consultar lección"}
                  </Link>
                </li>
              ))}
            </ul>
            {!module.lessons.length && (
              <p className="mt-4 text-sm text-muted">
                Este módulo todavía no tiene lecciones.
              </p>
            )}
            {!course.enrolled && (
              <details className="mt-5 rounded-xl bg-surface-soft p-4">
                <summary className="cursor-pointer py-2 font-semibold text-brand">
                  Añadir lección
                </summary>
                <div className="mt-5">
                  <LessonEditor
                    courseId={id}
                    moduleId={module.id}
                    enrolled={false}
                    nextOrder={
                      Math.max(0, ...module.lessons.map((l) => l.order)) + 1
                    }
                    canEdit={canEdit}
                  />
                </div>
              </details>
            )}
          </article>
        ))}
        {!course.enrolled && (
          <details className="ui-card p-6" open={!course.modules.length}>
            <summary className="cursor-pointer py-2 text-xl font-semibold text-brand">
              Añadir módulo
            </summary>
            <div className="mt-5">
              <ModuleEditor
                courseId={id}
                enrolled={false}
                nextOrder={
                  Math.max(0, ...course.modules.map((m) => m.order)) + 1
                }
                canEdit={canEdit}
              />
            </div>
          </details>
        )}
      </section>
    </>
  );
}

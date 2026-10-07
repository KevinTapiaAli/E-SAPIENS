import Link from "next/link";
import { notFound } from "next/navigation";
import { portalSession } from "@/features/portal/server";
import { readPrivateApi } from "@/features/auth/server";
import { PortalHeading, PortalUnavailable } from "@/features/portal/portal-ui";
import { isClassroomLesson, isResourceId } from "@/features/classroom/server";
import { AcademicAction } from "@/features/classroom/academic-action";
import { StatePanel } from "@/shared/ui/state-panel";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ role: string; courseId: string; lessonId: string }>;
}) {
  const { role, courseId, lessonId } = await params;
  if (
    role !== "estudiante" ||
    !isResourceId(courseId) ||
    !isResourceId(lessonId)
  )
    notFound();
  await portalSession();
  const result = await readPrivateApi(
    `academic/classroom/${courseId}/lessons/${lessonId}`,
    isClassroomLesson,
  );
  const back = `/portal/estudiante/cursos/${courseId}`;
  if (!result.data)
    return (
      <>
        <Link
          href={back}
          className="text-link mb-6 inline-flex min-h-11 items-center"
        >
          ← Volver a la materia
        </Link>
        {result.status === 403 ? (
          <StatePanel
            title="Esta lección no está disponible para tu cuenta"
            description="Consulta el estado del módulo: puede faltar autorización, haber vencido el plazo o quedar requisitos académicos pendientes."
          />
        ) : (
          <PortalUnavailable />
        )}
      </>
    );
  const lesson = result.data;
  let externalUrl: string | null = null;
  if (lesson.type === "enlace" && lesson.content) {
    try {
      const url = new URL(lesson.content.trim());
      if (url.protocol === "https:") externalUrl = url.href;
    } catch {
      /* El contenido se presenta como texto si no es una URL HTTPS. */
    }
  }
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={back}
        className="text-link mb-6 inline-flex min-h-11 items-center"
      >
        ← {lesson.courseTitle}
      </Link>
      <PortalHeading
        eyebrow={lesson.moduleTitle}
        title={lesson.title}
        description={`${lesson.durationMinutes} minutos estimados · ${lesson.completed ? "Lección completada" : "Lectura y aprendizaje a tu ritmo"}`}
      />
      <article className="ui-card p-6 sm:p-10">
        {lesson.content?.trim() ? (
          <div className="whitespace-pre-wrap break-words text-base leading-8">
            {lesson.content}
          </div>
        ) : (
          <StatePanel
            title="Contenido en preparación"
            description="El docente todavía no ha publicado el contenido de esta lección. Puedes volver al temario y consultar otra lección disponible."
          />
        )}
        {externalUrl && (
          <a
            className="text-link mt-6 inline-flex min-h-11 items-center"
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir recurso externo ↗
          </a>
        )}
      </article>
      <section className="ui-card mt-6 p-6">
        <h2 className="text-lg font-semibold">Tu avance</h2>
        {lesson.completed ? (
          <p className="mt-3 text-success">
            Ya registraste esta lección como completada. Puedes repasarla
            mientras tu acceso esté vigente.
          </p>
        ) : lesson.canComplete ? (
          <>
            <p className="mt-2 text-sm text-muted">
              Cuando termines de leer y realizar las indicaciones, marca la
              lección como completada. Esto registra tu avance; no equivale a
              aprobar una evaluación.
            </p>
            <AcademicAction
              path={`classroom/${courseId}/lessons/${lessonId}/complete`}
              label="Marcar como completada"
            />
          </>
        ) : (
          <p className="mt-3 text-muted">
            El registro de avance se habilita cuando la lección tiene contenido
            compatible disponible en el aula.
          </p>
        )}
        <Link
          href={back}
          className="text-link mt-5 inline-flex min-h-11 items-center"
        >
          Volver al temario y continuar →
        </Link>
      </section>
    </div>
  );
}

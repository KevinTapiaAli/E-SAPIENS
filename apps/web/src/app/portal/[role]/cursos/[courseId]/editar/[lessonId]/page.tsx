import Link from "next/link";
import { notFound } from "next/navigation";
import { portalSession } from "@/features/portal/server";
import { readPrivateApi } from "@/features/auth/server";
import { isResourceId } from "@/features/classroom/server";
import { PortalHeading, PortalUnavailable } from "@/features/portal/portal-ui";
import { isManagedLessonDetail } from "@/features/management/server";
import { LessonEditor } from "@/features/management/editor-forms";
export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ role: string; courseId: string; lessonId: string }>;
}) {
  const { role, courseId, lessonId } = await params;
  if (
    role !== "administrador" ||
    !isResourceId(courseId) ||
    !isResourceId(lessonId)
  )
    notFound();
  const user = await portalSession();
  const result = await readPrivateApi(
    `academic/management/courses/${courseId}/lessons/${lessonId}`,
    isManagedLessonDetail,
  );
  if (result.status === 404) notFound();
  if (!result.data) return <PortalUnavailable />;
  const data = result.data;
  return (
    <>
      <Link
        href={`/portal/administrador/cursos/${courseId}`}
        className="text-link mb-6 inline-flex min-h-11 items-center"
      >
        ← {data.courseTitle}
      </Link>
      <PortalHeading
        eyebrow={data.moduleTitle}
        title="Editar lección"
        description="El contenido publicado se muestra en el aula de los estudiantes autorizados."
      />
      <section className="ui-card max-w-5xl p-6 sm:p-8">
        <LessonEditor
          courseId={courseId}
          moduleId={data.moduleId}
          lesson={data.lesson}
          enrolled={data.enrolled}
          canEdit={user.permissions.includes("academic.edit")}
        />
      </section>
    </>
  );
}

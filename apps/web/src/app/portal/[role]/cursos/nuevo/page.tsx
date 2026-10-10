import Link from "next/link";
import { notFound } from "next/navigation";
import { portalSession } from "@/features/portal/server";
import { PortalHeading } from "@/features/portal/portal-ui";
import { CourseEditor } from "@/features/management/editor-forms";
export default async function NewCoursePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (role !== "administrador") notFound();
  const user = await portalSession();
  return (
    <>
      <Link
        href="/portal/administrador/cursos"
        className="text-link mb-6 inline-flex min-h-11 items-center"
      >
        ← Cursos y docentes
      </Link>
      <PortalHeading
        title="Crear materia"
        description="Define sus datos y requisitos. Después podrás añadir el temario y publicar su contenido."
      />
      <section className="ui-card max-w-4xl p-6 sm:p-8">
        <CourseEditor canEdit={user.permissions.includes("academic.edit")} />
      </section>
    </>
  );
}

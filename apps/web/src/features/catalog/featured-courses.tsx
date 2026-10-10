import Link from "next/link";
import { getCourses } from "./api";
import { CourseCard } from "./course-card";
import { StatePanel } from "@/shared/ui/state-panel";

export async function FeaturedCourses() {
  const result = await getCourses("limit=3");
  if (result.status !== "ok")
    return (
      <StatePanel
        type="error"
        title="No pudimos cargar las materias"
        description="El catálogo no está disponible en este momento. Puedes volver a intentarlo desde la sección de cursos."
        action={
          <Link href="/cursos" className="button button-secondary">
            Abrir catálogo
          </Link>
        }
      />
    );
  if (!result.data.items.length)
    return (
      <StatePanel
        title="Próximamente, nuevas materias"
        description="Las materias aparecerán aquí cuando se publiquen. Puedes consultar también nuestra biblioteca."
        action={
          <Link href="/biblioteca" className="button button-secondary">
            Explorar biblioteca
          </Link>
        }
      />
    );
  return (
    <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {result.data.items.map((course) => (
        <li key={course.id}>
          <CourseCard course={course} heading="h3" />
        </li>
      ))}
    </ul>
  );
}

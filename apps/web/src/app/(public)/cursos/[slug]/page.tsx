import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourse } from "@/features/catalog/api";
import { Badge } from "@/shared/ui/badge";
import { StatePanel } from "@/shared/ui/state-panel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCourse(slug);
  if (result.status !== "ok") return { title: "Detalle del curso" };
  return {
    title: result.data.title,
    description: result.data.description.slice(0, 160),
  };
}
export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getCourse(slug);
  if (result.status === "not-found" || result.status === "invalid-query")
    notFound();
  if (result.status !== "ok")
    return (
      <main
        tabIndex={-1}
        id="main-content"
        className="mx-auto max-w-4xl px-6 py-16"
      >
        <h1 className="mb-8 text-3xl font-bold">Detalle del curso</h1>
        <StatePanel
          type="error"
          title="No pudimos consultar este curso"
          description="Inténtalo nuevamente en unos instantes."
          action={
            <Link
              href="/cursos"
              className="text-link inline-flex min-h-11 items-center"
            >
              Volver a cursos
            </Link>
          }
        />
      </main>
    );
  const course = result.data;
  return (
    <main tabIndex={-1} id="main-content" className="min-h-[65vh]">
      <section className="page-hero">
        <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
          <Link
            href="/cursos"
            className="text-link mb-6 inline-flex min-h-11 items-center text-sm"
          >
            ← Todos los cursos
          </Link>
          <div>
            <Badge variant="brand">{course.category}</Badge>
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            {course.title}
          </h1>
          <p className="mt-6 max-w-3xl whitespace-pre-line text-lg leading-8 text-muted">
            {course.description}
          </p>
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 text-sm">
            <div>
              <dt className="text-muted">Nivel</dt>
              <dd className="mt-1 font-medium">{course.level}</dd>
            </div>
            <div>
              <dt className="text-muted">Duración</dt>
              <dd className="mt-1 font-medium">{course.durationHours} horas</dd>
            </div>
            <div>
              <dt className="text-muted">Idioma</dt>
              <dd className="mt-1 font-medium">
                {course.language === "es" ? "Español" : course.language}
              </dd>
            </div>
          </dl>
        </div>
      </section>
      <div className="mx-auto grid max-w-5xl gap-12 px-6 py-12 lg:grid-cols-[1fr_2fr]">
        <section>
          <h2 className="text-xl font-semibold">Lo que aprenderás</h2>
          <p className="mt-4 whitespace-pre-line leading-7 text-muted">
            {course.objectives}
          </p>
          <div className="mt-8 rounded-xl border border-line bg-brand-soft p-5">
            <p className="font-medium">Conoce el temario</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Consulta los temas publicados y solicita tu inscripción desde el
              portal. El acceso depende de la aprobación y vigencia de tu
              matrícula.
            </p>
            <Link
              href="/portal/estudiante/oferta"
              className="button button-primary mt-4"
            >
              Solicitar inscripción
            </Link>
          </div>
        </section>
        <section>
          <h2 className="mb-6 text-2xl font-semibold">Temario del curso</h2>
          {course.modules.length === 0 ? (
            <StatePanel
              as="h3"
              title="Temario en preparación"
              description="Los módulos se mostrarán cuando estén publicados."
            />
          ) : (
            <div className="space-y-4">
              {course.modules.map((module, index) => (
                <details
                  key={module.id}
                  open={index === 0}
                  className="ui-card px-5 py-2"
                >
                  <summary className="min-h-12 py-3 font-semibold">
                    <span className="mr-3 text-brand">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {module.title}
                  </summary>
                  {module.lessons.length ? (
                    <ol className="divide-y divide-line pb-3">
                      {module.lessons.map((lesson) => (
                        <li
                          key={lesson.id}
                          className="flex items-start justify-between gap-4 py-3 text-sm"
                        >
                          <span>{lesson.title}</span>
                          <span className="shrink-0 text-muted">
                            {lesson.durationMinutes} min
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-4 text-sm text-muted">
                      Las lecciones se publicarán próximamente.
                    </p>
                  )}
                </details>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

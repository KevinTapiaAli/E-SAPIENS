import Link from "next/link";
import { readPrivateApi } from "@/features/auth/server";
import { isAcademicCourses } from "./server";
import {
  CourseCards,
  PortalHeading,
  PortalPagination,
  PortalSearch,
  PortalUnavailable,
} from "./portal-ui";

export async function StudentCourses({
  q = "",
  cursor,
}: {
  q?: string;
  cursor?: string;
}) {
  const query = new URLSearchParams({
    role: "estudiante",
    q,
    ...(cursor ? { cursor } : {}),
  });
  const result = await readPrivateApi(
    `academic/courses?${query}`,
    isAcademicCourses,
  );
  const categories = [
    ...new Set(result.data?.items.map((c) => c.category) ?? []),
  ];
  return (
    <>
      <PortalHeading
        eyebrow="Mi biblioteca de aprendizaje"
        title="Mis materias"
        description="Tus materias, agrupadas por categoría y ordenadas por nombre. Entra al aula, encuentra materiales o consulta tus tareas."
      />
      <PortalSearch q={q} placeholder="Buscar una materia o categoría" />
      {!result.data ? (
        <PortalUnavailable />
      ) : !result.data.items.length ? (
        <section className="ui-card p-8">
          <h2 className="text-xl font-semibold">
            Tu próxima materia empieza aquí
          </h2>
          <p className="mt-3 text-muted">
            {q
              ? "Prueba otra búsqueda para encontrar tus materias."
              : "Cuando tu inscripción sea aprobada, encontrarás aquí la materia y sus recursos."}
          </p>
          <Link
            className="button button-primary mt-5"
            href="/portal/estudiante/oferta"
          >
            Explorar materias
          </Link>
        </section>
      ) : (
        <>
          <nav
            aria-label="Categorías de esta página"
            className="mb-6 flex flex-wrap gap-2"
          >
            {categories.map((c, i) => (
              <a
                key={c}
                href={`#categoria-${i}`}
                className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-brand"
              >
                {c}
              </a>
            ))}
          </nav>
          {categories.map((category, i) => (
            <section
              key={category}
              id={`categoria-${i}`}
              className="mb-8 scroll-mt-24"
            >
              <h2 className="mb-4 text-xl font-semibold">{category}</h2>
              <CourseCards
                courses={result.data!.items.filter(
                  (c) => c.category === category,
                )}
                role="estudiante"
              />
            </section>
          ))}
          <PortalPagination
            base="/portal/estudiante/cursos"
            q={q}
            cursor={cursor}
            next={result.data.nextCursor}
          />
        </>
      )}
    </>
  );
}

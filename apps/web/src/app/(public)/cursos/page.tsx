import type { Metadata } from "next";
import Link from "next/link";
import { getCourses } from "@/features/catalog/api";
import { CourseCard } from "@/features/catalog/course-card";

import { SectionHeading } from "@/shared/ui/section-heading";
import { StatePanel } from "@/shared/ui/state-panel";

import {
  CatalogSearch,
  CatalogPagination,
  catalogQuery,
  readSearchParams,
  type CatalogSearchParams,
} from "@/shared/ui/catalog-search";

export const metadata: Metadata = { title: "Cursos" };
export default async function CoursesPage({
  searchParams,
}: {
  searchParams: CatalogSearchParams;
}) {
  const { q, cursor } = readSearchParams(await searchParams);
  const result = await getCourses(catalogQuery(q, cursor));
  return (
    <main tabIndex={-1} id="main-content" className="min-h-[65vh]">
      <section className="page-hero">
        <div className="page-shell py-10 sm:py-12">
          <SectionHeading
            as="h1"
            eyebrow="Formación"
            title="Encuentra tu próximo curso"
            description="Conoce los objetivos y el temario de cada curso para elegir tu próximo paso."
          />
        </div>
      </section>
      <section
        aria-label="Catálogo de cursos"
        className="page-shell py-8 sm:py-10"
      >
        <CatalogSearch action="/cursos" q={q} label="Buscar cursos" />
        {result.status !== "ok" ? (
          <StatePanel
            type="error"
            title={
              result.status === "invalid-query"
                ? "Revisa tu búsqueda"
                : "No pudimos cargar los cursos"
            }
            description={
              result.status === "invalid-query"
                ? "Utiliza hasta 100 caracteres o vuelve al inicio del catálogo."
                : "El catálogo no está disponible en este momento. Inténtalo nuevamente en unos instantes."
            }
            action={
              <Link
                href="/cursos"
                className="text-link inline-flex min-h-11 items-center"
              >
                Volver al catálogo
              </Link>
            }
          />
        ) : result.data.items.length === 0 ? (
          <StatePanel
            title={
              q
                ? "No encontramos cursos con esa búsqueda"
                : cursor
                  ? "Llegaste al final del catálogo"
                  : "Estamos preparando nuestros cursos"
            }
            description={
              q
                ? "Prueba con otro título o tema."
                : "Los cursos publicados estarán disponibles aquí con su temario y objetivos."
            }
            action={
              q || cursor ? (
                <Link
                  href="/cursos"
                  className="text-link inline-flex min-h-11 items-center"
                >
                  Ver todos los cursos
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <p className="mb-6 text-sm text-muted">
              {result.data.items.length} cursos en esta página
              {q ? ` para “${q}”` : ""}.
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {result.data.items.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
            <CatalogPagination
              path="/cursos"
              q={q}
              cursor={cursor}
              nextCursor={result.data.nextCursor}
            />
          </>
        )}
      </section>
    </main>
  );
}

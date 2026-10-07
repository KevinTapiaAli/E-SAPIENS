import type { Metadata } from "next";
import Link from "next/link";
import { getCourses } from "@/features/catalog/api";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { SectionHeading } from "@/shared/ui/section-heading";
import { StatePanel } from "@/shared/ui/state-panel";
import { Icon } from "@/shared/ui/icon";
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
                <Card key={course.id} className="flex flex-col">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="brand">{course.category}</Badge>
                    <Icon name="book" className="h-5 w-5 text-brand" />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold">
                    <Link
                      href={`/cursos/${encodeURIComponent(course.slug)}`}
                      className="hover:text-brand hover:underline underline-offset-4"
                    >
                      {course.title}
                    </Link>
                  </h2>
                  <p className="mt-3 line-clamp-3 leading-7 text-muted">
                    {course.description}
                  </p>
                  <p className="mt-5 flex items-center gap-2 text-sm text-muted">
                    <Icon name="clock" className="h-4 w-4" />
                    {course.level} · {course.durationHours} horas
                  </p>
                  <Link
                    href={`/cursos/${encodeURIComponent(course.slug)}`}
                    className="text-link mt-auto inline-flex min-h-11 items-center gap-2 self-start pt-6"
                    aria-label={`Ver temario de ${course.title}`}
                  >
                    Ver curso y temario{" "}
                    <Icon name="arrow" className="h-4 w-4" />
                  </Link>
                </Card>
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

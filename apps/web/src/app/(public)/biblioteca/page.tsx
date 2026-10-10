import type { Metadata } from "next";
import Link from "next/link";
import { getLibrary } from "@/features/library/api";
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

export const metadata: Metadata = { title: "Biblioteca" };
const typeLabels = {
  libro: "Libro",
  articulo: "Artículo",
  guia: "Guía",
  video: "Video",
};
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: CatalogSearchParams;
}) {
  const { q, cursor } = readSearchParams(await searchParams);
  const result = await getLibrary(catalogQuery(q, cursor));
  return (
    <main tabIndex={-1} id="main-content" className="min-h-[65vh]">
      <section className="page-hero">
        <div className="page-shell py-10 sm:py-12">
          <SectionHeading
            as="h1"
            eyebrow="Biblioteca"
            title="Tu material académico, fácil de encontrar"
            description="Explora fichas bibliográficas, autores y temas para complementar tu aprendizaje."
          />
        </div>
      </section>
      <section
        aria-label="Fichas de biblioteca"
        className="page-shell py-8 sm:py-10"
      >
        <CatalogSearch
          action="/biblioteca"
          q={q}
          label="Buscar en la biblioteca"
        />
        {result.status !== "ok" ? (
          <StatePanel
            type="error"
            title={
              result.status === "invalid-query"
                ? "Revisa tu búsqueda"
                : "No pudimos cargar la biblioteca"
            }
            description={
              result.status === "invalid-query"
                ? "Utiliza hasta 100 caracteres o vuelve al inicio de la biblioteca."
                : "Inténtalo nuevamente en unos instantes."
            }
            action={
              <Link
                href="/biblioteca"
                className="text-link inline-flex min-h-11 items-center"
              >
                Volver a la biblioteca
              </Link>
            }
          />
        ) : result.data.items.length === 0 ? (
          <StatePanel
            title={
              q
                ? "No encontramos material con esa búsqueda"
                : "Todavía no hay fichas en esta página"
            }
            description="Prueba con otro título o vuelve al inicio de la biblioteca."
            action={
              <Link
                href="/biblioteca"
                className="text-link inline-flex min-h-11 items-center"
              >
                Ver biblioteca
              </Link>
            }
          />
        ) : (
          <>
            <p className="mb-6 text-sm text-muted">
              {result.data.items.length} fichas en esta página
              {q ? ` para “${q}”` : ""}.
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {result.data.items.map((item) => (
                <Card key={item.id} className="flex flex-col">
                  <div className="flex items-center justify-between gap-3">
                    <Badge>{typeLabels[item.type]}</Badge>
                    <Icon name="library" className="h-5 w-5 text-accent" />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold">
                    <Link
                      href={`/biblioteca/${item.id}`}
                      className="hover:text-brand hover:underline underline-offset-4"
                    >
                      {item.title}
                    </Link>
                  </h2>
                  <p className="mt-3 text-sm text-muted">
                    {item.authors.join(", ") || "Autoría no indicada"}
                  </p>
                  <p className="mt-3 line-clamp-3 leading-7 text-muted">
                    {item.description}
                  </p>
                  <Link
                    href={`/biblioteca/${item.id}`}
                    className="text-link mt-auto inline-flex min-h-11 items-center gap-2 self-start pt-6"
                    aria-label={`Consultar ficha de ${item.title}`}
                  >
                    Ver temas y referencia{" "}
                    <Icon name="arrow" className="h-4 w-4" />
                  </Link>
                </Card>
              ))}
            </div>
            <CatalogPagination
              path="/biblioteca"
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

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLibraryItem } from "@/features/library/api";
import { Badge } from "@/shared/ui/badge";
import { StatePanel } from "@/shared/ui/state-panel";

export const metadata: Metadata = { title: "Ficha bibliográfica" };
export default async function LibraryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getLibraryItem(id);
  if (result.status === "not-found" || result.status === "invalid-query")
    notFound();
  if (result.status !== "ok")
    return (
      <main
        tabIndex={-1}
        id="main-content"
        className="mx-auto max-w-4xl px-6 py-16"
      >
        <h1 className="mb-8 text-3xl font-bold">Ficha bibliográfica</h1>
        <StatePanel
          type="error"
          title="No pudimos consultar esta ficha"
          description="Inténtalo nuevamente en unos instantes."
          action={
            <Link
              href="/biblioteca"
              className="text-link inline-flex min-h-11 items-center"
            >
              Volver a biblioteca
            </Link>
          }
        />
      </main>
    );
  const item = result.data;
  return (
    <main
      tabIndex={-1}
      id="main-content"
      className="mx-auto max-w-5xl px-6 py-12"
    >
      <Link
        href="/biblioteca"
        className="text-link mb-6 inline-flex min-h-11 items-center text-sm"
      >
        ← Toda la biblioteca
      </Link>
      <div>
        <Badge variant="brand">Ficha bibliográfica</Badge>
      </div>
      <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
        {item.title}
      </h1>
      <p className="mt-6 whitespace-pre-line text-lg leading-8 text-muted">
        {item.description}
      </p>
      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <section className="ui-card p-6">
          <h2 className="text-xl font-semibold">Referencia bibliográfica</h2>
          <p className="mt-4 leading-7 text-muted">
            {item.authors.join(", ") || "Autoría no indicada"}. (
            {item.year ?? "s. f."}). <cite>{item.title}</cite>.{" "}
            {item.publisher ?? "Editorial no indicada"}.
          </p>
          {item.isbn ? (
            <p className="mt-4 text-sm text-muted">ISBN: {item.isbn}</p>
          ) : null}
          <p className="mt-6 border-t border-line pt-5 text-sm leading-6 text-muted">
            Esta ficha permite conocer el material. La consulta de archivos se
            habilitará según los permisos de cada curso.
          </p>
        </section>
        <section>
          <h2 className="mb-5 text-2xl font-semibold">Temas y contenido</h2>
          {item.sections.length ? (
            <ol className="divide-y divide-line">
              {item.sections.map((section, index) => (
                <li
                  key={`${index}-${section.title}`}
                  className="flex items-start justify-between gap-4 py-4"
                >
                  <span>
                    <span className="mr-3 text-brand">{index + 1}.</span>
                    {section.title}
                  </span>
                  {section.pageStart !== null ? (
                    <span className="shrink-0 text-sm text-muted">
                      p. {section.pageStart}
                      {section.pageEnd !== null ? `–${section.pageEnd}` : ""}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <StatePanel
              as="h3"
              title="Índice en preparación"
              description="Los temas se mostrarán cuando estén disponibles."
            />
          )}
        </section>
      </div>
    </main>
  );
}

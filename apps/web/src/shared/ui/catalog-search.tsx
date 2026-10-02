import Link from "next/link";
import { Icon } from "./icon";

export type CatalogSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;
export function readSearchParams(
  params: Record<string, string | string[] | undefined>,
) {
  return {
    q: typeof params.q === "string" ? params.q : "",
    cursor: typeof params.cursor === "string" ? params.cursor : "",
  };
}
export function catalogQuery(q: string, cursor = ""): string {
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (cursor) query.set("cursor", cursor);
  return query.toString();
}
export function CatalogSearch({
  action,
  q,
  label,
}: {
  action: string;
  q: string;
  label: string;
}) {
  return (
    <form
      action={action}
      method="get"
      role="search"
      className="mb-8 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-end sm:p-6"
    >
      <div className="flex-1">
        <label
          htmlFor="catalog-search"
          className="mb-2 block text-sm font-semibold text-ink"
        >
          {label}
        </label>
        <input
          id="catalog-search"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={100}
          placeholder="Escribe un título o tema"
          className="min-h-12 w-full rounded-lg border border-input bg-surface px-4 text-base text-ink"
        />
      </div>
      <button type="submit" className="button button-primary min-h-12">
        <Icon name="search" className="h-4 w-4" />
        Buscar
      </button>
      {q ? (
        <Link href={action} className="text-link px-3 py-3 text-sm">
          Limpiar búsqueda
        </Link>
      ) : null}
    </form>
  );
}
export function CatalogPagination({
  path,
  q,
  cursor,
  nextCursor,
}: {
  path: string;
  q: string;
  cursor: string;
  nextCursor: string | null;
}) {
  if (!cursor && !nextCursor) return null;
  return (
    <nav
      aria-label="Paginación"
      className="mt-10 flex flex-wrap items-center justify-between gap-5 border-t border-line pt-6"
    >
      {cursor ? (
        <Link
          href={`${path}?${catalogQuery(q)}`}
          className="text-link inline-flex min-h-11 items-center"
        >
          Volver al principio
        </Link>
      ) : (
        <span />
      )}
      {nextCursor ? (
        <Link
          href={`${path}?${catalogQuery(q, nextCursor)}`}
          className="button button-secondary"
        >
          Ver más resultados →
        </Link>
      ) : null}
    </nav>
  );
}

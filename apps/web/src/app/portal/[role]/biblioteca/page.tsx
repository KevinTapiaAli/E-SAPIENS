import Link from "next/link";
import { notFound } from "next/navigation";
import type { PublicPage } from "@esapiens/contracts";
import { portalSession } from "@/features/portal/server";
import { isWorkspaceRole } from "@/features/portal/navigation";
import { readPrivateApi } from "@/features/auth/server";
import { isRecord, isPublicPage } from "@/shared/api/public-api";
import { PortalHeading, PortalUnavailable } from "@/features/portal/portal-ui";
import { isResourceId } from "@/features/classroom/server";
import { AcademicAction } from "@/features/classroom/academic-action";
type Saved = { id: string; title: string; description: string };
const isSaved = (v: unknown): v is PublicPage<Saved> =>
  isPublicPage(
    v,
    (i: unknown): i is Saved =>
      isRecord(i) &&
      typeof i.id === "string" &&
      typeof i.title === "string" &&
      typeof i.description === "string",
  );
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { role } = await params;
  if (!isWorkspaceRole(role)) notFound();
  await portalSession();
  const { cursor } = await searchParams;
  const r = await readPrivateApi(
    `academic/saved-library${isResourceId(cursor ?? "") ? `?cursor=${cursor}` : ""}`,
    isSaved,
  );
  if (!r.data) return <PortalUnavailable />;
  return (
    <>
      <PortalHeading
        title="Mi biblioteca"
        description="Guarda referencias para encontrarlas fácilmente. Los archivos conservan sus condiciones de acceso."
      />
      <Link className="button button-primary mb-6" href="/biblioteca">
        Explorar biblioteca
      </Link>
      {!r.data.items.length && (
        <p>
          Todavía no guardaste referencias. Abre una ficha de la biblioteca y
          selecciona Guardar referencia.
        </p>
      )}
      <section
        className="grid gap-4 sm:grid-cols-2"
        aria-label="Referencias guardadas"
      >
        {r.data.items.map((i) => (
          <article className="ui-card p-5" key={i.id}>
            <h2 className="text-xl font-semibold">
              <Link href={`/biblioteca/${i.id}`}>{i.title}</Link>
            </h2>
            <p className="mt-3 line-clamp-3">{i.description}</p>
            <AcademicAction
              path={`saved-library/${i.id}`}
              label="Retirar de mi lista"
              payload={{ saved: false }}
            />
          </article>
        ))}
      </section>
      {r.data.nextCursor && (
        <Link
          className="button button-secondary mt-4"
          href={`?cursor=${r.data.nextCursor}`}
        >
          Más referencias
        </Link>
      )}
      {cursor && (
        <Link className="text-link" href="?">
          Volver al inicio
        </Link>
      )}
    </>
  );
}

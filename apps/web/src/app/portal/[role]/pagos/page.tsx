import Link from "next/link";
import { notFound } from "next/navigation";
import { portalSession, isAcademicCourses } from "@/features/portal/server";
import { portalNavigation } from "@/features/portal/navigation";
import { readPrivateApi } from "@/features/auth/server";
import { PortalHeading, PortalUnavailable } from "@/features/portal/portal-ui";
import { isPlans, isOrders, isPayments } from "@/features/lms/data";
import {
  BuyPlan,
  PaymentForm,
  PaymentReview,
  PlanForm,
} from "@/features/lms/commerce-forms";
import { isResourceId } from "@/features/classroom/server";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ cursor?: string; orders?: string; q?: string }>;
}) {
  const { role } = await params;
  if (role !== "administrador" && role !== "estudiante") notFound();
  const user = await portalSession();
  if (!portalNavigation(role, user).some((n) => n.section === "pagos"))
    notFound();
  const search = await searchParams;
  const cursor = isResourceId(search.cursor ?? "") ? search.cursor : undefined;
  const ordersCursor = isResourceId(search.orders ?? "")
    ? search.orders
    : undefined;
  const query = typeof search.q === "string" ? search.q.slice(0, 100) : "";
  if (role === "administrador") {
    const [payments, courses] = await Promise.all([
      readPrivateApi(
        `academic/commerce/pending?limit=12${cursor ? `&cursor=${cursor}` : ""}`,
        isPayments,
      ),
      readPrivateApi(
        `academic/courses?role=administrador&limit=24&q=${encodeURIComponent(query)}`,
        isAcademicCourses,
      ),
    ]);
    if (!payments.data || !courses.data) return <PortalUnavailable />;
    return (
      <>
        <PortalHeading
          title="Pagos y planes"
          description="Verifica el ingreso en el banco antes de aprobar. Confirmar registra los accesos de forma transaccional."
        />
        <section className="space-y-4" aria-label="Pagos pendientes">
          {payments.data.items.length === 0 && (
            <p>No hay pagos pendientes de revisión.</p>
          )}
          {payments.data.items.map((p) => (
            <article key={p.id} className="ui-card p-5">
              <h2 className="text-xl font-semibold">
                Orden #{p.number} · {p.amount} {p.currency}
              </h2>
              <p>{p.email}</p>
              <p>
                Referencia: {p.reference} · {p.method}
              </p>
              <p className="text-sm text-muted">
                Vigencia:{" "}
                {new Date(p.expiresAt).toLocaleString("es-BO", {
                  timeZone: "America/La_Paz",
                })}
              </p>
              <PaymentReview id={p.id} />
            </article>
          ))}
          {payments.data.nextCursor && (
            <Link
              className="button button-secondary"
              href={`?cursor=${payments.data.nextCursor}`}
            >
              Siguiente página de pagos
            </Link>
          )}
          {cursor && (
            <Link className="text-link" href="?">
              Volver al inicio de la bandeja
            </Link>
          )}
        </section>
        <section className="ui-card mt-8 p-5">
          <h2 className="mb-4 text-xl font-semibold">
            Publicar un plan de acceso
          </h2>
          <form className="mb-4 flex gap-2">
            <label className="form-label flex-1">
              Buscar materia
              <input
                name="q"
                defaultValue={query}
                maxLength={100}
                className="form-input"
              />
            </label>
            <button className="button button-secondary">Buscar</button>
          </form>
          <p className="mb-3 text-sm text-muted">
            Se muestran hasta 24 coincidencias; busca por título para localizar
            otra materia.
          </p>
          <PlanForm
            courses={courses.data.items.filter((c) => c.status === "publicado")}
          />
        </section>
      </>
    );
  }
  const [plans, orders] = await Promise.all([
    readPrivateApi(
      `academic/commerce/plans?limit=12${cursor ? `&cursor=${cursor}` : ""}`,
      isPlans,
    ),
    readPrivateApi(
      `academic/commerce/orders?limit=12${ordersCursor ? `&cursor=${ordersCursor}` : ""}`,
      isOrders,
    ),
  ]);
  if (!plans.data || !orders.data) return <PortalUnavailable />;
  const paymentsEnabled = !!plans.data.instructions;
  return (
    <>
      <PortalHeading
        title="Planes y mis compras"
        description="Elige un plan, realiza el pago institucional y registra su referencia. El acceso se habilita después de la revisión."
      />
      <aside className="ui-card mb-6 p-5">
        <h2 className="font-semibold">Instrucciones de pago</h2>
        <p className="mt-2 whitespace-pre-wrap">
          {plans.data.instructions ??
            "La institución aún no habilitó los pagos. Consulta con administración."}
        </p>
      </aside>
      <section
        aria-label="Planes disponibles"
        className="grid gap-4 sm:grid-cols-2"
      >
        {plans.data.items.length === 0 && <p>Aún no hay planes publicados.</p>}
        {plans.data.items.map((p) => (
          <article className="ui-card space-y-3 p-5" key={p.id}>
            <h2 className="text-xl font-semibold">{p.name}</h2>
            <p>{p.description}</p>
            <p>
              {p.price} {p.currency} · {p.days} días
            </p>
            <BuyPlan id={p.id} enabled={paymentsEnabled} />
          </article>
        ))}
      </section>
      {plans.data.nextCursor && (
        <Link
          className="button button-secondary mt-4"
          href={`?cursor=${plans.data.nextCursor}${ordersCursor ? `&orders=${ordersCursor}` : ""}`}
        >
          Más planes
        </Link>
      )}
      <section className="mt-8 space-y-4" aria-label="Mis compras">
        <h2 className="text-2xl font-semibold">Mis compras</h2>
        {orders.data.items.length === 0 && <p>Todavía no tienes compras.</p>}
        {orders.data.items.map((o) => (
          <article key={o.id} className="ui-card p-5">
            <h3 className="text-lg font-semibold">
              Orden #{o.number} · {o.description}
            </h3>
            <p>
              {o.total} {o.currency} · {o.status}{" "}
              {o.paymentStatus ? `· Pago: ${o.paymentStatus}` : ""}
            </p>
            <p className="text-sm text-muted">
              Vence:{" "}
              {new Date(o.expiresAt).toLocaleString("es-BO", {
                timeZone: "America/La_Paz",
              })}
            </p>
            {o.reviewReason && <p>Revisión: {o.reviewReason}</p>}
            {o.status === "pendiente" &&
              o.paymentStatus !== "pendiente" &&
              o.paymentStatus !== "confirmado" && <PaymentForm id={o.id} />}
            {o.status === "pagada" && (
              <Link href="/portal/estudiante/cursos" className="text-link">
                Ir a mis cursos
              </Link>
            )}
          </article>
        ))}
        {orders.data.nextCursor && (
          <Link
            className="button button-secondary"
            href={`?orders=${orders.data.nextCursor}${cursor ? `&cursor=${cursor}` : ""}`}
          >
            Más compras
          </Link>
        )}
        {(cursor || ordersCursor) && (
          <Link className="text-link" href="?">
            Volver a los primeros resultados
          </Link>
        )}
      </section>
    </>
  );
}

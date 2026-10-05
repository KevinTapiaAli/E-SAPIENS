import Link from "next/link";
import { notFound } from "next/navigation";
import { portalSession } from "@/features/portal/server";
import { readPrivateApi } from "@/features/auth/server";
import { formatAccessTime } from "@/features/classroom/format-time";
import {
  PortalHeading,
  PortalUnavailable,
  StatusBadge,
  PortalPagination,
} from "@/features/portal/portal-ui";
import { isEnrollmentAccess, isResourceId } from "@/features/classroom/server";
import { AccessForm } from "@/features/classroom/access-form";
import { AcademicAction } from "@/features/classroom/academic-action";
import { EnrollmentStateControl } from "@/features/management/account-controls";

export default async function EnrollmentAccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ role: string; enrollmentId: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { role, enrollmentId } = await params;
  if (role !== "administrador" || !isResourceId(enrollmentId)) notFound();
  const user = await portalSession();
  const { cursor } = await searchParams;
  const result = await readPrivateApi(
    `academic/enrollments/${enrollmentId}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
    isEnrollmentAccess,
  );
  if (result.status === 404) notFound();
  if (!result.data) return <PortalUnavailable />;
  const enrollment = result.data;
  return (
    <>
      <Link
        href="/portal/administrador/matriculas"
        className="text-link mb-6 inline-flex min-h-11 items-center"
      >
        ← Matrículas y acceso
      </Link>
      <PortalHeading
        eyebrow="Gestión de acceso"
        title={enrollment.student}
        description={enrollment.course}
      />
      <div className="mb-6">
        <StatusBadge status={enrollment.status} />
      </div>
      {user.permissions.includes("academic.access") && (
        <AccessForm enrollment={enrollment} />
      )}
      {user.permissions.includes("academic.enroll") && (
        <div className="mt-6">
          <EnrollmentStateControl
            id={enrollment.id}
            status={enrollment.status}
          />
        </div>
      )}
      <section className="mt-8">
        <h2 className="text-2xl font-semibold">Historial de autorizaciones</h2>
        <p className="mt-2 text-sm text-muted">
          Historial paginado, desde las autorizaciones más recientes. Un módulo
          puede tener varias autorizaciones; basta una vigente para su
          cobertura. Revocar una no cancela las demás.
        </p>
        {!enrollment.grants.length ? (
          <p className="ui-card mt-5 p-6 text-muted">
            Todavía no se autorizó acceso a ningún módulo. La matrícula por sí
            sola no habilita las lecciones.
          </p>
        ) : (
          <ul className="mt-5 grid gap-4 xl:grid-cols-2">
            {enrollment.grants.map((grant) => {
              const expired = Date.parse(grant.endsAt) <= Date.now();
              const scheduled = Date.parse(grant.startsAt) > Date.now();
              return (
                <li key={grant.id} className="ui-card p-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                    {grant.revokedAt
                      ? "Revocada"
                      : expired
                        ? "Vencida"
                        : scheduled
                          ? "Programada"
                          : "Vigente"}{" "}
                    · {grant.source === "purchase" ? "Compra" : "Institucional"}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold">{grant.module}</h3>
                  <p className="mt-2 text-sm text-muted">
                    Desde {formatAccessTime(grant.startsAt, user.timeZone)}{" "}
                    hasta {formatAccessTime(grant.endsAt, user.timeZone)} (
                    {user.timeZone})
                  </p>
                  <p className="mt-3 text-sm">
                    {grant.reason ?? "Autorización vinculada a compra."}
                  </p>
                  {grant.source === "institutional" &&
                    !grant.revokedAt &&
                    !expired &&
                    user.permissions.includes("academic.access") && (
                      <details className="mt-4">
                        <summary className="cursor-pointer py-3 text-sm font-medium text-danger">
                          Revocar esta autorización
                        </summary>
                        <AcademicAction
                          path={`enrollments/${enrollment.id}/access/${grant.id}/revoke`}
                          label="Confirmar revocación"
                          reason
                        />
                      </details>
                    )}
                </li>
              );
            })}
          </ul>
        )}
        <PortalPagination
          base={`/portal/administrador/matriculas/${enrollmentId}`}
          cursor={cursor}
          next={enrollment.nextGrantCursor}
        />
      </section>
    </>
  );
}

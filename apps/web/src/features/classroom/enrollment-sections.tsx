import Link from "next/link";
import type { SessionUser, WorkspaceRole } from "@esapiens/contracts";
import { readPrivateApi } from "@/features/auth/server";
import { formatAccountDate } from "@/features/auth/format-date";
import {
  PortalHeading,
  PortalSearch,
  PortalPagination,
  PortalUnavailable,
  StatusBadge,
} from "@/features/portal/portal-ui";
import { StatePanel } from "@/shared/ui/state-panel";
import { isEnrollmentRequests } from "./server";
import { AcademicAction } from "./academic-action";
import { StudentOfferings } from "./student-offerings";

export async function EnrollmentSection({
  section,
  user,
  q,
  cursor,
  role,
}: {
  section: "oferta" | "inscripciones";
  user: SessionUser;
  q: string;
  cursor?: string;
  role: WorkspaceRole;
}) {
  const params = new URLSearchParams({ q, ...(cursor ? { cursor } : {}) });
  if (section === "oferta") return <StudentOfferings q={q} cursor={cursor} />;
  const result = await readPrivateApi(
    `academic/registration-requests?${params}&role=${role}`,
    isEnrollmentRequests,
  );
  return (
    <>
      <PortalHeading
        title="Solicitudes de materias"
        description={
          role === "docente"
            ? "Aprueba o rechaza las solicitudes de las materias que tienes asignadas. Administración habilita después los módulos y su vigencia."
            : "Consulta las decisiones de los docentes. La aprobación de estas solicitudes corresponde al docente asignado a la materia."
        }
      />
      <PortalSearch q={q} placeholder="Estudiante o materia" />
      {!result.data ? (
        <PortalUnavailable />
      ) : (
        <>
          {!result.data.items.length && (
            <StatePanel
              title="Sin solicitudes para mostrar"
              description="Las solicitudes enviadas desde el portal del estudiante aparecerán aquí."
            />
          )}
          <div className="grid gap-5 xl:grid-cols-2">
            {result.data.items.map((request) => (
              <article className="ui-card p-6" key={request.id}>
                <StatusBadge status={request.status} />
                <h2 className="mt-3 text-xl font-semibold">
                  {request.student}
                </h2>
                <p className="mt-2 font-medium">{request.course}</p>
                <p className="mt-2 text-sm text-muted">
                  Solicitada el{" "}
                  {formatAccountDate(request.requestedAt, user.timeZone)}
                </p>
                {request.status === "pendiente" &&
                role === "docente" &&
                user.permissions.includes("teaching.enroll") ? (
                  <AcademicAction
                    path={`registration-requests/${request.id}/review`}
                    label="Guardar decisión"
                    reason
                    review
                  />
                ) : (
                  request.reason && (
                    <p className="mt-4 text-sm text-muted">{request.reason}</p>
                  )
                )}
                {request.enrollmentId && role === "administrador" && (
                  <Link
                    className="text-link mt-4 inline-flex min-h-11 items-center"
                    href={`/portal/administrador/matriculas/${request.enrollmentId}`}
                  >
                    Gestionar módulos y acceso →
                  </Link>
                )}
              </article>
            ))}
          </div>
          <PortalPagination
            base={`/portal/${role}/inscripciones`}
            q={q}
            cursor={cursor}
            next={result.data.nextCursor}
          />
        </>
      )}
    </>
  );
}

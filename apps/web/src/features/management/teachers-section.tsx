import Link from "next/link";
import type { SessionUser } from "@esapiens/contracts";
import { readPrivateApi } from "@/features/auth/server";
import { isAcademicPeople } from "@/features/portal/server";
import {
  PortalHeading,
  PortalPagination,
  PortalSearch,
  PortalUnavailable,
  StatusBadge,
} from "@/features/portal/portal-ui";
import { CreateAccount, TeacherProfileReview } from "./account-controls";
import { AcademicOperationForm } from "@/features/portal/academic-operation-form";
import { StatePanel } from "@/shared/ui/state-panel";
import { formatAccountDate } from "@/features/auth/format-date";
export async function TeachersSection({
  user,
  q,
  cursor,
}: {
  user: SessionUser;
  q: string;
  cursor?: string;
}) {
  const query = new URLSearchParams({
    kind: "docente",
    q,
    ...(cursor ? { cursor } : {}),
  });
  const result = await readPrivateApi(
    `academic/people?${query}`,
    isAcademicPeople,
  );
  return (
    <>
      <PortalHeading
        eyebrow="Administración"
        title="Docentes y asignaciones"
        description="Da de alta docentes, registra la revisión de su formación y asígnalos a materias de su especialidad."
      />
      {user.permissions.includes("identity.manage") && (
        <CreateAccount
          generalAdmin={user.roles.includes("administrador_general")}
          teacherOnly
        />
      )}
      {user.permissions.includes("academic.assign") && (
        <AcademicOperationForm operation="assignments" />
      )}
      <PortalSearch q={q} placeholder="Nombre o correo del docente" />
      {!result.data ? (
        <PortalUnavailable />
      ) : (
        <>
          {!result.data.items.length && (
            <StatePanel
              title="No hay docentes para mostrar"
              description="Los docentes registrados aparecerán aquí con su especialidad y revisión de formación."
            />
          )}
          <div className="grid gap-5 xl:grid-cols-2">
            {result.data.items.map((person) => (
              <article key={person.id} className="ui-card p-6">
                <StatusBadge status={person.status} />
                <h2 className="mt-3 text-xl font-semibold">
                  {person.firstName} {person.lastName}
                </h2>
                <p className="mt-1 break-words text-sm text-muted">
                  {person.email}
                </p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-muted">Especialidad</dt>
                    <dd className="mt-1 font-medium">
                      {person.specialty ?? "Pendiente de registrar"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Revisión de formación</dt>
                    <dd className="mt-1 whitespace-pre-wrap">
                      {person.qualificationReview ??
                        "Registra la revisión antes de asignar nuevas materias."}
                    </dd>
                  </div>
                </dl>
                {person.qualificationReviewedAt && (
                  <p className="mt-3 text-xs text-muted">
                    Revisada:{" "}
                    {formatAccountDate(
                      person.qualificationReviewedAt,
                      user.timeZone,
                    )}
                  </p>
                )}
                {person.curriculumUrl?.startsWith("https://") && (
                  <a
                    href={person.curriculumUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link mt-3 inline-flex min-h-11 items-center"
                  >
                    Consultar currículum ↗
                  </a>
                )}
                {user.permissions.includes("identity.manage") &&
                  person.profileRevision !== null && (
                    <TeacherProfileReview
                      key={person.profileRevision}
                      person={person}
                    />
                  )}
                <Link
                  className="text-link mt-3 inline-flex min-h-11 items-center text-sm"
                  href={`/portal/administrador/usuarios?q=${encodeURIComponent(person.email)}`}
                >
                  Gestionar cuenta y estado →
                </Link>
              </article>
            ))}
          </div>
          <PortalPagination
            base="/portal/administrador/docentes"
            q={q}
            cursor={cursor}
            next={result.data.nextCursor}
          />
        </>
      )}
    </>
  );
}

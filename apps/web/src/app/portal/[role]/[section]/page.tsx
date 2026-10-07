import { notFound } from "next/navigation";
import Link from "next/link";
import { EnrollmentSection } from "@/features/classroom/enrollment-sections";
import {
  CreateAccount,
  UserStateControl,
} from "@/features/management/account-controls";
import {
  isWorkspaceRole,
  portalNavigation,
  roleLabels,
} from "@/features/portal/navigation";
import {
  portalSession,
  isAcademicCourses,
  isAcademicPeople,
  isAcademicEnrollments,
} from "@/features/portal/server";
import {
  readIdentity,
  readPrivateApi,
  isPendingPage,
} from "@/features/auth/server";
import {
  CourseCards,
  PortalHeading,
  PortalSearch,
  PortalPagination,
  PortalUnavailable,
  StatusBadge,
} from "@/features/portal/portal-ui";
import { AccountReview } from "@/features/auth/account-review";
import { AcademicOperationForm } from "@/features/portal/academic-operation-form";
import { StatePanel } from "@/shared/ui/state-panel";
import { LogoutButton } from "@/features/auth/logout-button";
import { formatAccountDate } from "@/features/auth/format-date";
import {
  ProgressSection,
  type ProgressFilters,
} from "@/features/progress/progress-section";
import { ProfilePhotoEditor } from "@/features/portal/profile-photo";
import MetricsPage from "@/features/portal/metrics-page";
import { TeachersSection } from "@/features/management/teachers-section";
import { StudentCourses } from "@/features/portal/student-courses";

export default async function PortalSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ role: string; section: string }>;
  searchParams: Promise<ProgressFilters>;
}) {
  const { role, section } = await params;
  if (!isWorkspaceRole(role)) notFound();
  const user = await portalSession();
  const item = portalNavigation(role, user).find(
    (item) => item.section === section,
  );
  if (!item || section === "resumen") notFound();
  const filters = await searchParams;
  if (
    section === "informes" ||
    (section === "progreso" && role === "estudiante")
  )
    return (
      <MetricsPage
        params={Promise.resolve({ role })}
        filters={filters}
        section={section}
      />
    );
  if (
    section === "seguimiento" &&
    (role === "docente" || role === "administrador")
  )
    return <ProgressSection role={role} user={user} filters={filters} />;
  const { q = "", cursor } = filters;
  if (section === "cursos" && role === "estudiante")
    return <StudentCourses q={q} cursor={cursor} />;
  if (section === "docentes" && role === "administrador")
    return <TeachersSection user={user} q={q} cursor={cursor} />;
  const query = new URLSearchParams({ q, ...(cursor ? { cursor } : {}) });
  const base = `/portal/${role}/${section}`;
  if (section === "oferta" || section === "inscripciones")
    return (
      <EnrollmentSection
        section={section}
        role={role}
        user={user}
        q={q}
        cursor={cursor}
      />
    );
  if (section === "cuenta")
    return (
      <>
        <PortalHeading
          title="Mi cuenta"
          description="La información con la que accedes a E-SAPIENS."
        />
        <section className="ui-card max-w-3xl p-6 sm:p-8">
          <ProfilePhotoEditor
            initials={`${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`}
          />
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-xl font-semibold text-brand">
              {user.firstName[0]}
              {user.lastName[0]}
            </span>
            <div>
              <h2 className="text-xl font-semibold">
                {user.firstName} {user.lastName}
              </h2>
              <p className="mt-1 text-sm text-muted">Cuenta aprobada</p>
            </div>
          </div>
          <dl className="mt-8 grid gap-6 border-t border-line pt-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted">Correo electrónico</dt>
              <dd className="mt-2 break-all font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Perfiles asignados</dt>
              <dd className="mt-2 font-medium">
                {user.roles
                  .map((r) =>
                    r === "administrador_general"
                      ? "Administrador general"
                      : isWorkspaceRole(r)
                        ? roleLabels[r]
                        : r,
                  )
                  .join(", ")}
              </dd>
            </div>
          </dl>
          <p className="mt-8 border-t border-line pt-6 text-sm text-muted">
            Para corregir tus datos o solicitar un cambio de acceso, contacta
            con la administración de E-SAPIENS.
          </p>
          <div className="mt-5">
            <LogoutButton />
          </div>
        </section>
      </>
    );
  if (section === "solicitudes") {
    const result = await readIdentity(
      `pending${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
      isPendingPage,
    );
    return (
      <>
        <PortalHeading
          title="Solicitudes de acceso"
          description="Revisa los datos de cada estudiante y deja constancia de tu decisión."
        />
        {!result.data ? (
          <PortalUnavailable />
        ) : (
          <>
            {result.data.items.length ? (
              <div className="grid gap-5 xl:grid-cols-2">
                {result.data.items.map((account) => (
                  <AccountReview
                    key={account.id}
                    account={account}
                    timeZone={user.timeZone}
                  />
                ))}
              </div>
            ) : (
              <StatePanel
                title="Todo al día"
                description="No hay solicitudes pendientes en esta página. Las nuevas solicitudes aparecerán aquí."
              />
            )}
            <PortalPagination
              base={base}
              cursor={cursor}
              next={result.data.nextCursor}
            />
          </>
        )}
      </>
    );
  }
  if (section === "usuarios") {
    const result = await readPrivateApi(
      `academic/people?${query}`,
      isAcademicPeople,
    );
    return (
      <>
        <PortalHeading
          title="Usuarios de la plataforma"
          description="Consulta las cuentas registradas, su estado y sus perfiles de acceso."
        />
        {user.permissions.includes("identity.manage") && (
          <CreateAccount
            generalAdmin={user.roles.includes("administrador_general")}
          />
        )}
        <PortalSearch
          q={q}
          placeholder="Nombre, apellido o correo electrónico"
        />
        {!result.data ? (
          <PortalUnavailable />
        ) : (
          <>
            {!result.data.items.length ? (
              <StatePanel
                title="Sin usuarios para esta búsqueda"
                description="Prueba con otro nombre o correo."
              />
            ) : (
              <div className="ui-card overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <caption className="sr-only">
                    Usuarios registrados en E-SAPIENS
                  </caption>
                  <thead className="border-b border-line bg-surface-soft text-muted">
                    <tr>
                      {[
                        "Persona",
                        "Correo",
                        "Perfiles",
                        "Estado",
                        ...(user.permissions.includes("identity.manage")
                          ? ["Acciones"]
                          : []),
                      ].map((label) => (
                        <th
                          key={label}
                          scope="col"
                          className="px-5 py-4 font-medium"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.items.map((person) => (
                      <tr
                        className="border-b border-line last:border-0"
                        key={person.id}
                      >
                        <th scope="row" className="px-5 py-4 font-medium">
                          {person.firstName} {person.lastName}
                        </th>
                        <td className="max-w-64 break-words px-5 py-4 text-muted">
                          {person.email}
                        </td>
                        <td className="px-5 py-4 text-muted">
                          {person.roles
                            .map((r) =>
                              r === "administrador_general"
                                ? "Administrador general"
                                : isWorkspaceRole(r)
                                  ? roleLabels[r]
                                  : r,
                            )
                            .join(", ") || "Sin perfil"}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={person.status} />
                        </td>
                        {user.permissions.includes("identity.manage") && (
                          <td className="px-5 py-4 align-top">
                            <UserStateControl
                              person={person}
                              actorId={user.id}
                              generalAdmin={user.roles.includes(
                                "administrador_general",
                              )}
                            />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <PortalPagination
              base={base}
              cursor={cursor}
              next={result.data.nextCursor}
              q={q}
            />
          </>
        )}
      </>
    );
  }
  if (section === "matriculas") {
    const result = await readPrivateApi(
      `academic/enrollments?${query}`,
      isAcademicEnrollments,
    );
    return (
      <>
        <PortalHeading
          title="Matrículas"
          description="Registra la incorporación de estudiantes a los cursos y consulta sus inscripciones."
        />
        {user.permissions.includes("academic.enroll") && (
          <AcademicOperationForm operation="enrollments" />
        )}
        <PortalSearch q={q} placeholder="Estudiante o curso" />
        {!result.data ? (
          <PortalUnavailable />
        ) : (
          <>
            {!result.data.items.length ? (
              <StatePanel
                title="Sin matrículas para mostrar"
                description="Las matrículas registradas aparecerán aquí con su estado y motivo."
              />
            ) : (
              <div className="ui-card overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <caption className="sr-only">Registro de matrículas</caption>
                  <thead className="border-b border-line bg-surface-soft text-muted">
                    <tr>
                      {["Estudiante", "Curso", "Estado", "Fecha", "Motivo"].map(
                        (label) => (
                          <th
                            key={label}
                            scope="col"
                            className="px-5 py-4 font-medium"
                          >
                            {label}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.items.map((enrollment) => (
                      <tr
                        key={enrollment.id}
                        className="border-b border-line last:border-0"
                      >
                        <th scope="row" className="px-5 py-4 font-medium">
                          <Link
                            href={`/portal/administrador/matriculas/${enrollment.id}`}
                            className="text-link inline-flex min-h-11 items-center"
                          >
                            {enrollment.student} →
                          </Link>
                        </th>
                        <td className="max-w-64 px-5 py-4">
                          {enrollment.course}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={enrollment.status} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-muted">
                          {formatAccountDate(
                            enrollment.enrolledAt,
                            user.timeZone,
                          )}
                        </td>
                        <td className="max-w-72 break-words px-5 py-4 text-muted">
                          {enrollment.reason ?? "No registrado"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <PortalPagination
              base={base}
              cursor={cursor}
              next={result.data.nextCursor}
              q={q}
            />
          </>
        )}
      </>
    );
  }
  const result = await readPrivateApi(
    `academic/courses?${query}&role=${role}`,
    isAcademicCourses,
  );
  return (
    <>
      <PortalHeading
        title={
          section === "progreso"
            ? "Mi progreso"
            : role === "administrador"
              ? "Cursos y docentes"
              : "Mis cursos"
        }
        description={
          section === "progreso"
            ? "Avance registrado en las lecciones publicadas de tus cursos inscritos."
            : role === "administrador"
              ? "Consulta la oferta académica, las matrículas activas y los docentes asignados."
              : role === "docente"
                ? "Cursos asignados a tu perfil y estudiantes con matrícula activa."
                : "Tus inscripciones y el progreso registrado en cada curso."
        }
      />
      {role === "administrador" &&
        user.permissions.includes("academic.edit") && (
          <div className="mb-6">
            <Link
              href="/portal/administrador/cursos/nuevo"
              className="button button-primary"
            >
              Crear materia
            </Link>
          </div>
        )}
      <PortalSearch q={q} placeholder="Título del curso o categoría" />
      {!result.data ? (
        <PortalUnavailable />
      ) : (
        <>
          <CourseCards courses={result.data.items} role={role} />
          <PortalPagination
            base={base}
            cursor={cursor}
            next={result.data.nextCursor}
            q={q}
          />
        </>
      )}
      {role === "estudiante" && (
        <p className="mt-6 max-w-3xl text-sm text-muted">
          Abre una materia para consultar sus módulos, estudiar las lecciones
          autorizadas y registrar tu avance. La disponibilidad depende de tu
          matrícula, el plazo de acceso y los requisitos académicos.
        </p>
      )}
    </>
  );
}

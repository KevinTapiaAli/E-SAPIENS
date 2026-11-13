import Link from "next/link";
import type { SessionUser, WorkspaceRole } from "@esapiens/contracts";
import { readPrivateApi } from "@/features/auth/server";
import { isResourceId } from "@/features/classroom/server";
import { Icon } from "@/shared/ui/icon";
import { isAcademicCourses } from "./server";
import { portalSpaces, spaceNavigation, type PortalSpace } from "./spaces";
import { sectionDescriptions } from "./navigation";
import {
  PortalHeading,
  PortalPagination,
  PortalSearch,
  PortalUnavailable,
  StatusBadge,
} from "./portal-ui";

export function SpaceChoices({ role }: { role: WorkspaceRole }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {(["gestion", "aula"] as const).map((space, index) => (
        <Link
          key={space}
          href={`/portal/${role}/${space}`}
          prefetch={false}
          className="group ui-card flex min-h-72 flex-col p-6 transition-colors hover:border-brand sm:p-8"
        >
          <div className="mb-6 flex items-center justify-between">
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${index === 0 ? "bg-brand-soft text-brand" : "bg-accent-soft text-accent"}`}
            >
              <Icon name={portalSpaces[space].icon} className="h-7 w-7" />
            </span>
            <span className="text-sm text-muted">0{index + 1}</span>
          </div>
          <h2 className="text-2xl font-semibold">
            {portalSpaces[space].title}
          </h2>
          <p className="mt-3 text-muted">{portalSpaces[space].description}</p>
          <span className="mt-8 inline-flex items-center gap-2 font-semibold text-brand">
            Entrar {index === 0 ? "a gestión" : "al aula"} <Icon name="arrow" />
          </span>
        </Link>
      ))}
    </div>
  );
}

export function SpaceHome({
  role,
  user,
  space,
}: {
  role: WorkspaceRole;
  user: SessionUser;
  space: PortalSpace;
}) {
  const links = spaceNavigation(role, user, space).filter(
    (i) => !["resumen", "cuenta"].includes(i.section),
  );
  return (
    <>
      <PortalHeading
        eyebrow={
          space === "gestion"
            ? "Trámites y consultas"
            : "Aprendizaje y actividades"
        }
        title={portalSpaces[space].title}
        description={
          space === "gestion"
            ? "Consulta tus materias, gestiona inscripciones y revisa pagos. Para estudiar o trabajar en tareas, cambia al Aula virtual."
            : "Selecciona una materia para abrir sus contenidos, entregar o revisar tareas y consultar evaluaciones."
        }
      />
      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {links.map((item) => (
          <Link
            key={item.section}
            href={item.href}
            prefetch={false}
            className="ui-card p-5 hover:border-brand"
          >
            <span className="flex items-center gap-3 font-semibold">
              <Icon name={item.icon} />
              {item.label}
              <Icon name="arrow" className="ml-auto h-4 w-4" />
            </span>
            <p className="mt-3 text-sm text-muted">
              {sectionDescriptions[item.section]}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}

export async function SpaceCourses({
  role,
  q = "",
  cursor,
  aula = false,
}: {
  role: WorkspaceRole;
  q?: string;
  cursor?: string;
  aula?: boolean;
}) {
  const query = new URLSearchParams({
    role,
    q: typeof q === "string" ? q.slice(0, 100) : "",
    ...(isResourceId(cursor ?? "") ? { cursor: cursor! } : {}),
  });
  const result = await readPrivateApi(
    `academic/courses?${query}`,
    isAcademicCourses,
  );
  const base = `/portal/${role}/${aula ? "aula" : "materias"}`;
  return (
    <section
      aria-label={aula ? "Materias del aula" : "Registro académico de materias"}
    >
      <h2 className="mb-4 text-xl font-semibold">
        {aula
          ? "Elige una materia"
          : role === "estudiante"
            ? "Materias inscritas"
            : "Registro de materias"}
      </h2>
      <PortalSearch
        q={typeof q === "string" ? q : ""}
        placeholder="Buscar materia o categoría"
      />
      {!result.data ? (
        <PortalUnavailable />
      ) : (
        <>
          {!result.data.items.length && (
            <div className="ui-card p-6">
              <p>No hay materias para mostrar con estos filtros.</p>
              {role === "estudiante" && (
                <Link
                  className="text-link mt-3 inline-flex min-h-11 items-center"
                  href="/portal/estudiante/oferta"
                >
                  Consultar oferta académica
                </Link>
              )}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {result.data.items.map((course) => (
              <article key={course.id} className="ui-card p-5">
                <div className="mb-3 flex flex-wrap gap-2">
                  <StatusBadge
                    status={course.enrollmentStatus ?? course.status}
                  />
                  <span className="text-sm text-muted">{course.category}</span>
                </div>
                <h3 className="text-lg font-semibold">{course.title}</h3>
                <p className="mt-2 text-sm text-muted">
                  Docente: {course.teachers.join(", ") || "Por asignar"}
                </p>
                {aula ? (
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <Link
                      className="button button-primary"
                      href={`/portal/${role}/cursos/${course.id}${role === "administrador" ? "/materiales" : ""}`}
                    >
                      Abrir aula
                    </Link>
                    <Link
                      className="button button-secondary"
                      href={`/portal/${role}/cursos/${course.id}/tareas`}
                    >
                      Tareas y entregas
                    </Link>
                    <Link
                      className="button button-secondary"
                      href={`/portal/${role}/cursos/${course.id}/evaluaciones`}
                    >
                      Evaluaciones
                    </Link>
                    <Link
                      className="button button-secondary"
                      href={`/portal/${role}/cursos/${course.id}/materiales`}
                    >
                      Materiales
                    </Link>
                  </div>
                ) : (
                  <Link
                    className="button button-secondary mt-5"
                    href={`/portal/${role}/cursos/${course.id}${role === "administrador" ? "/materiales" : ""}`}
                  >
                    Ir al aula de esta materia <Icon name="arrow" />
                  </Link>
                )}
              </article>
            ))}
          </div>
          <PortalPagination
            base={base}
            q={q}
            cursor={cursor}
            next={result.data.nextCursor}
          />
        </>
      )}
    </section>
  );
}

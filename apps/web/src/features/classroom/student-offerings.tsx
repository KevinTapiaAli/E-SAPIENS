import Link from "next/link";
import { readPrivateApi } from "@/features/auth/server";
import {
  PortalHeading,
  PortalSearch,
  PortalPagination,
  PortalUnavailable,
  StatusBadge,
} from "@/features/portal/portal-ui";
import { AcademicAction } from "./academic-action";
import { isOfferings } from "./server";

export async function StudentOfferings({
  q,
  cursor,
}: {
  q: string;
  cursor?: string;
}) {
  const result = await readPrivateApi(
    `academic/offerings?${new URLSearchParams({ q, ...(cursor ? { cursor } : {}) })}`,
    isOfferings,
  );
  const categories = [
    ...new Set(result.data?.items.map((c) => c.category) ?? []),
  ];
  return (
    <>
      <PortalHeading
        eyebrow="Sigue descubriendo"
        title="Encuentra tu próxima materia"
        description="Explora por área, conoce el contenido y solicita tu inscripción al docente."
      />
      <ol className="mb-6 grid gap-3 rounded-2xl border border-line bg-brand-soft p-5 text-sm sm:grid-cols-3">
        <li>
          <strong className="mr-2 text-brand">01</strong> Elige tu materia
        </li>
        <li>
          <strong className="mr-2 text-brand">02</strong> Solicita al docente tu
          inscripción
        </li>
        <li>
          <strong className="mr-2 text-brand">03</strong> Administración
          habilita tu acceso
        </li>
      </ol>
      <PortalSearch
        q={q}
        placeholder="¿Qué te gustaría aprender? Busca una materia o categoría"
      />
      {!result.data ? (
        <PortalUnavailable />
      ) : (
        <>
          {!!categories.length && (
            <nav
              className="mb-6 flex flex-wrap gap-2"
              aria-label="Áreas de esta página"
            >
              {categories.map((cat, i) => (
                <a
                  className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-brand"
                  key={cat}
                  href={`#oferta-${i}`}
                >
                  {cat}
                </a>
              ))}
            </nav>
          )}
          {!result.data.items.length && (
            <p className="ui-card p-8 text-muted">
              No encontramos materias para esta búsqueda. Prueba con otra
              palabra.
            </p>
          )}
          {categories.map((category, i) => (
            <section
              key={category}
              id={`oferta-${i}`}
              className="mb-8 scroll-mt-24"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">{category}</h2>
                <Link
                  className="text-link text-sm"
                  href={`/portal/estudiante/oferta?${new URLSearchParams({ q: category })}`}
                >
                  Buscar en esta área →
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {result
                  .data!.items.filter((c) => c.category === category)
                  .map((course) => (
                    <article
                      className="ui-card flex min-w-0 flex-col p-5"
                      key={course.id}
                    >
                      <div
                        className="mb-3 h-1 w-12 rounded bg-brand"
                        aria-hidden
                      />
                      <h3 className="text-lg font-semibold">{course.title}</h3>
                      <details className="mt-3 text-sm text-muted">
                        <summary className="cursor-pointer text-brand">
                          ¿Qué aprenderé?
                        </summary>
                        <p className="mt-2 whitespace-pre-wrap leading-6">
                          {course.description ||
                            "Consulta el temario de la materia para conocer sus contenidos."}
                        </p>
                      </details>
                      <div className="mt-auto pt-5">
                        {course.enrollmentStatus ? (
                          <>
                            <StatusBadge status={course.enrollmentStatus} />
                            <Link
                              href={`/portal/estudiante/cursos/${course.id}`}
                              className="button button-secondary mt-3 w-full"
                            >
                              Ver mi materia
                            </Link>
                          </>
                        ) : course.requestStatus ? (
                          <div className="rounded-xl bg-surface-soft p-4">
                            <StatusBadge status={course.requestStatus} />
                            <p className="mt-2 text-sm text-muted">
                              {course.requestReason ||
                                "Tu solicitud está registrada. Aquí verás la decisión del docente."}
                            </p>
                          </div>
                        ) : (
                          <AcademicAction
                            path="registration-requests"
                            payload={{ courseId: course.id }}
                            label="Quiero inscribirme"
                          />
                        )}
                      </div>
                    </article>
                  ))}
              </div>
            </section>
          ))}
          <PortalPagination
            base="/portal/estudiante/oferta"
            q={q}
            cursor={cursor}
            next={result.data.nextCursor}
          />
        </>
      )}
    </>
  );
}

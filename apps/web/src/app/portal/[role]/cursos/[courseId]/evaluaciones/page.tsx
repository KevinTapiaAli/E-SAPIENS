import Link from "next/link";
import { notFound } from "next/navigation";
import { portalSession } from "@/features/portal/server";
import { isWorkspaceRole } from "@/features/portal/navigation";
import { readPrivateApi } from "@/features/auth/server";
import { isResourceId } from "@/features/classroom/server";
import { isTeachingCourse } from "@/features/teaching/server";
import { CourseWorkspaceLinks } from "@/features/teaching/workspace";
import { PortalHeading, PortalUnavailable } from "@/features/portal/portal-ui";
import { isEvaluations, isEvaluationResults } from "@/features/lms/data";
import {
  EvaluationEditor,
  TakeEvaluation,
} from "@/features/lms/evaluation-forms";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ role: string; courseId: string }>;
  searchParams: Promise<{
    cursor?: string;
    evaluation?: string;
    resultCursor?: string;
  }>;
}) {
  const { role, courseId } = await params;
  if (!isWorkspaceRole(role) || !isResourceId(courseId)) notFound();
  await portalSession();
  const { cursor: raw, evaluation, resultCursor } = await searchParams;
  const cursor = isResourceId(raw ?? "") ? raw : undefined;
  const [course, evaluations, results] = await Promise.all([
    readPrivateApi(
      `academic/teaching/${courseId}?role=${role}`,
      isTeachingCourse,
    ),
    readPrivateApi(
      `academic/evaluations/${courseId}?role=${role}${cursor ? `&cursor=${cursor}` : ""}`,
      isEvaluations,
    ),
    role !== "estudiante" && isResourceId(evaluation ?? "")
      ? readPrivateApi(
          `academic/evaluations/${courseId}/${evaluation}/results?role=${role}${isResourceId(resultCursor ?? "") ? `&cursor=${resultCursor}` : ""}`,
          isEvaluationResults,
        )
      : Promise.resolve(null),
  ]);
  if (course.status === 404 || evaluations.status === 404) notFound();
  if (!course.data || !evaluations.data) return <PortalUnavailable />;
  return (
    <>
      <PortalHeading
        title={`Evaluaciones · ${course.data.title}`}
        description="Selección única, plazo de entrega e intentos limitados. La calificación se calcula en el servidor."
      />
      <CourseWorkspaceLinks role={role} id={courseId} />
      <section className="space-y-4" aria-label="Evaluaciones disponibles">
        {!evaluations.data.items.length && (
          <p>No hay evaluaciones disponibles para este acceso.</p>
        )}
        {evaluations.data.items.map((e) => (
          <article key={e.id} className="ui-card p-5">
            <h2 className="text-xl font-semibold">{e.title}</h2>
            <p>
              {e.module} · {e.minutes} minutos · {e.attempts} intentos por
              estudiante · Aprueba con {e.passingScore}/100
            </p>
            <p>
              {role === "estudiante" ? "Tus intentos" : "Intentos registrados"}:{" "}
              {e.usedAttempts}.{" "}
              {role === "estudiante"
                ? "Tu mejor nota"
                : "Mayor nota registrada"}
              :{" "}
              {e.bestScore === null ? "Sin resultados" : e.bestScore.toFixed(2)}
            </p>
            {role === "estudiante" ? (
              <TakeEvaluation courseId={courseId} id={e.id} />
            ) : (
              <Link
                className="button button-secondary mt-3"
                href={`?evaluation=${e.id}${cursor ? `&cursor=${cursor}` : ""}#resultados`}
              >
                Ver resultados del grupo
              </Link>
            )}
          </article>
        ))}
        {evaluations.data.nextCursor && (
          <Link
            className="button button-secondary"
            href={`?cursor=${evaluations.data.nextCursor}`}
          >
            Más evaluaciones
          </Link>
        )}
        {cursor && (
          <Link className="text-link" href="?">
            Volver al inicio
          </Link>
        )}
      </section>
      {results && (
        <section id="resultados" className="ui-card mt-6 overflow-x-auto p-5">
          <h2 className="mb-4 text-xl font-semibold">Resultados del grupo</h2>
          {!results.data ? (
            <PortalUnavailable />
          ) : (
            <>
              <table className="w-full text-left">
                <caption className="sr-only">
                  Intentos y notas de la evaluación seleccionada
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Estudiante</th>
                    <th scope="col">Intento</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Nota / 100</th>
                  </tr>
                </thead>
                <tbody>
                  {results.data.items.map((t) => (
                    <tr key={t.id}>
                      <th scope="row" className="py-3 font-normal">
                        {t.student}
                      </th>
                      <td>{t.number}</td>
                      <td>{t.status}</td>
                      <td>
                        {t.score === null ? "Pendiente" : t.score.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!results.data.items.length && (
                <p>Aún no hay intentos registrados.</p>
              )}
              {results.data.nextCursor && (
                <Link
                  className="button button-secondary mt-4"
                  href={`?evaluation=${evaluation}&resultCursor=${results.data.nextCursor}#resultados`}
                >
                  Más resultados
                </Link>
              )}
            </>
          )}
        </section>
      )}
      {role === "docente" && (
        <EvaluationEditor courseId={courseId} modules={course.data.modules} />
      )}
    </>
  );
}

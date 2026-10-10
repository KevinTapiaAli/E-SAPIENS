import Link from "next/link";
import type { PublicPage, StudentProgress } from "@esapiens/contracts";
import { StatusBadge } from "./portal-ui";
export function AcademicRecord({
  page,
  base,
  query,
}: {
  page: PublicPage<StudentProgress>;
  base: string;
  query: URLSearchParams;
}) {
  const next = new URLSearchParams(query);
  if (page.nextCursor) next.set("cursor", page.nextCursor);
  const first = new URLSearchParams(query);
  first.delete("cursor");
  return (
    <section className="mt-7">
      <h2 className="text-xl font-semibold">Mi cárdex de aprendizaje</h2>
      <p className="my-3 text-sm text-muted">
        Promedio de los últimos intentos calificados, sin ponderación. No
        sustituye una nota final ni un certificado. Las clases sin registro
        confirmado no se contabilizan como ausencias.
      </p>
      <div className="ui-card overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <caption className="sr-only">Historial personal de materias</caption>
          <thead className="border-b border-line bg-surface-soft">
            <tr>
              {[
                "Materia",
                "Matrícula",
                "Lecciones",
                "Tareas / 100",
                "Entregas",
                "Asistencias confirmadas",
              ].map((h) => (
                <th key={h} scope="col" className="p-4">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {page.items.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <th scope="row" className="p-4">
                  <Link
                    href={`/portal/estudiante/cursos/${r.courseId}`}
                    className="text-link"
                  >
                    {r.course}
                  </Link>
                </th>
                <td className="p-4">
                  <StatusBadge status={r.enrollmentStatus} />
                </td>
                <td className="p-4">
                  {r.percent === null
                    ? "Sin contenido"
                    : `${r.percent}% · ${r.completedLessons}/${r.totalLessons}`}
                </td>
                <td className="p-4">
                  {r.taskAverage ?? "Sin calificar"}
                  <span className="block text-xs text-muted">
                    {r.gradedTasks} tareas calificadas
                  </span>
                </td>
                <td className="p-4">{r.submittedTasks}</td>
                <td className="p-4">
                  {r.finishedClasses
                    ? `${r.attendedClasses}/${r.finishedClasses}`
                    : "Sin clases registradas"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!page.items.length && (
          <p className="p-6 text-muted">
            No hay matrículas para esta consulta.
          </p>
        )}
      </div>
      <nav aria-label="Páginas del cárdex" className="mt-4 flex gap-3">
        {query.has("cursor") && (
          <Link href={`${base}?${first}`} className="button button-secondary">
            Primera página
          </Link>
        )}
        {page.nextCursor && (
          <Link href={`${base}?${next}`} className="button button-secondary">
            Más materias →
          </Link>
        )}
      </nav>
    </section>
  );
}

import Link from "next/link";
import type { ExecutiveDashboard, SessionUser } from "@esapiens/contracts";
import { readPrivateApi } from "@/features/auth/server";
import { PortalHeading, PortalUnavailable } from "@/features/portal/portal-ui";
import { DashboardRefresh } from "@/features/portal/dashboard-refresh";
import { isExecutiveDashboard } from "./server";

const number = new Intl.NumberFormat("es-BO");
const day = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeZone: "UTC",
});
const rate = (n: number, total: number) =>
  total ? `${number.format(Math.round((n / total) * 1000) / 10)} %` : "—";
const base = "/portal/administrador";

function Kpi({
  label,
  value,
  detail,
  hint,
}: {
  label: string;
  value: string;
  detail: string;
  hint: string;
}) {
  return (
    <article className="ui-card flex min-w-0 flex-col p-5 sm:p-6">
      <h2 className="text-sm font-medium text-muted">{label}</h2>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-ink tabular-nums">
        {value}
      </p>
      <p className="mt-3 text-xs font-medium text-brand">{detail}</p>
      <p className="mt-2 text-xs leading-6 text-muted">{hint}</p>
    </article>
  );
}

function DecisionBrief({
  data,
  user,
}: {
  data: ExecutiveDashboard;
  user: SessionUser;
}) {
  const l = data.learning,
    t = data.traffic;
  const actions: {
    title: string;
    detail: string;
    href: string;
    label: string;
    urgent?: boolean;
  }[] = [];
  if (l.inactiveStudents)
    actions.push({
      title: `${number.format(l.inactiveStudents)} estudiantes necesitan acompañamiento`,
      detail:
        "Sin actividad académica registrada durante al menos 14 días. Revisa acceso y dificultades antes de atribuir abandono.",
      href: "#estudiantes-atencion",
      label: "Ver estudiantes",
      urgent: true,
    });
  if (l.pendingAccounts && user.permissions.includes("identity.review"))
    actions.push({
      title: `${number.format(l.pendingAccounts)} cuentas esperan revisión`,
      detail:
        "Resolver estas solicitudes permite que nuevas personas accedan a la oferta académica.",
      href: `${base}/solicitudes`,
      label: "Revisar cuentas",
    });
  if (l.unassignedCourses)
    actions.push({
      title: `${number.format(l.unassignedCourses)} materias publicadas sin docente habilitado`,
      detail:
        "Asigna un docente aprobado para evitar que se acumulen solicitudes sin responsable.",
      href: `${base}/docentes`,
      label: "Revisar asignaciones",
      urgent: true,
    });
  if (l.pendingEnrollments)
    actions.push({
      title: `${number.format(l.pendingEnrollments)} inscripciones pendientes`,
      detail:
        "Coordina la revisión con los docentes responsables. Una solicitud todavía no representa una matrícula aprobada.",
      href: `${base}/inscripciones`,
      label: "Consultar solicitudes",
    });
  if (l.ungradedSubmissions)
    actions.push({
      title: `${number.format(l.ungradedSubmissions)} entregas esperan calificación`,
      detail:
        "Corresponden a la última versión de cada tarea entregada. Prioriza la retroalimentación con los docentes.",
      href: `${base}/cursos`,
      label: "Abrir materias",
    });
  const comparable =
    Date.parse(data.trackingSince) <= Date.parse(data.period.from);
  if (comparable && t.visitors >= 30 && t.accountConversions === 0)
    actions.push({
      title: "Hay visitas, pero no solicitudes de cuenta atribuidas",
      detail:
        "Revisa la claridad del acceso y del registro. Esta señal incluye solo navegadores medidos; no demuestra por sí sola un problema.",
      href: "/registro",
      label: "Consultar registro",
    });
  if (!actions.length)
    actions.push({
      title: "Mantén el seguimiento de la comunidad",
      detail:
        "No aparecen pendientes en los indicadores disponibles. Revisa participación y tendencias; la ausencia de alertas no certifica el rendimiento académico.",
      href: `${base}/informes`,
      label: "Consultar análisis académico",
    });
  return (
    <section className="ui-card p-5 sm:p-7" aria-labelledby="decision-heading">
      <p className="eyebrow">Apoyo a decisiones</p>
      <h2 id="decision-heading" className="mt-2 text-xl font-semibold">
        Qué requiere atención
      </h2>
      <p className="mt-2 text-sm text-muted">
        Prioridades sugeridas a partir de los registros; cada decisión sigue en
        manos de administración.
      </p>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {actions.map((action) => (
          <article
            key={action.title}
            className={`rounded-xl border p-5 ${action.urgent ? "border-warning bg-warning-soft" : "border-line bg-surface-soft"}`}
          >
            <h3 className="font-semibold">{action.title}</h3>
            <p className="mt-2 text-sm leading-7 text-muted">{action.detail}</p>
            <Link
              href={action.href}
              className="text-link mt-2 inline-flex min-h-11 items-center text-sm"
            >
              {action.label} →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export async function ExecutiveDashboardView({
  user,
  days: requestedDays,
}: {
  user: SessionUser;
  days?: string;
}) {
  const days = ["7", "30", "90"].includes(requestedDays ?? "")
    ? requestedDays!
    : "30";
  if (!user.permissions.includes("academic.read")) return <PortalUnavailable />;
  const result = await readPrivateApi(
    `analytics/dashboard?days=${days}`,
    isExecutiveDashboard,
  );
  const data = result.data;
  return (
    <div className="space-y-7">
      <PortalHeading
        eyebrow="Dirección y gestión"
        title="Panel ejecutivo"
        description="Captación, participación y pendientes para decidir dónde enfocar el esfuerzo de E-SAPIENS."
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <nav aria-label="Periodo de captación" className="flex flex-wrap gap-2">
          {["7", "30", "90"].map((period) => (
            <Link
              key={period}
              href={`${base}/gestion?days=${period}`}
              prefetch={false}
              aria-current={days === period ? "page" : undefined}
              className={`button ${days === period ? "button-primary" : "button-secondary"}`}
            >
              {period} días
            </Link>
          ))}
        </nav>
        <Link
          href={`${base}/informes`}
          className="text-link inline-flex min-h-11 items-center text-sm"
        >
          Análisis académico detallado →
        </Link>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href={`${base}/datos`} className="button button-secondary">
          Centro de Datos: gráficos y exportaciones
        </Link>
        {user.permissions.includes("commerce.manage") && (
          <Link href={`${base}/pagos`} className="button button-secondary">
            Revisar pagos manuales
          </Link>
        )}
      </div>
      <DashboardRefresh />
      {!data ? (
        <PortalUnavailable />
      ) : (
        <DashboardContent data={data} user={user} />
      )}
    </div>
  );
}

function DashboardContent({
  data,
  user,
}: {
  data: ExecutiveDashboard;
  user: SessionUser;
}) {
  const { traffic: t, learning: l } = data;
  const hasCoverage =
    Date.parse(data.trackingSince) < Date.parse(data.period.to);
  const comparable =
    Date.parse(data.trackingSince) <= Date.parse(data.period.previousFrom);
  const endDay = new Date(Date.parse(data.period.to) - 1);
  const delta =
    comparable && t.previousVisitors > 0
      ? `${t.visitors >= t.previousVisitors ? "+" : ""}${number.format(Math.round(((t.visitors - t.previousVisitors) / t.previousVisitors) * 1000) / 10)} % frente al periodo anterior`
      : "Sin base comparable completa";
  return (
    <>
      <section aria-labelledby="acquisition-heading">
        <div className="mb-5">
          <h2 id="acquisition-heading" className="text-xl font-semibold">
            Captación y demanda
          </h2>
          <p className="mt-2 text-sm text-muted">
            {day.format(new Date(data.period.from))} – {day.format(endDay)} ·{" "}
            {data.period.days} días completos en UTC. Hoy se incluirá al
            finalizar el día.
          </p>
        </div>
        {Date.parse(data.trackingSince) >
          Date.parse(data.period.previousFrom) && (
          <p
            role="status"
            className="mb-5 rounded-xl border border-line bg-accent-soft p-4 text-sm"
          >
            Medición disponible desde {day.format(new Date(data.trackingSince))}
            . Los periodos anteriores tienen cobertura parcial o ninguna; no
            representan ausencia de visitas.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Visitantes únicos estimados"
            value={hasCoverage ? number.format(t.visitors) : "—"}
            detail={delta}
            hint="Navegadores medidos, deduplicados en todo el periodo. Una persona puede usar varios dispositivos."
          />
          <Kpi
            label="Conversión a solicitud de cuenta"
            value={hasCoverage ? rate(t.accountConversions, t.visitors) : "—"}
            detail={`${t.accountConversions} navegadores con solicitud / ${t.visitors} visitantes`}
            hint="Cuenta creada después de una visita en el periodo. Reintentos y correos ya registrados no suman."
          />
          <Kpi
            label="Conversión a solicitud de inscripción"
            value={
              hasCoverage
                ? rate(t.enrollmentConversions, t.courseVisitors)
                : "—"
            }
            detail={`${t.enrollmentConversions} navegadores con solicitud / ${t.courseVisitors} interesados`}
            hint="Interesados que consultaron cursos u oferta y después solicitaron inscripción en el mismo periodo."
          />
          <Kpi
            label="Solicitudes de inscripción"
            value={number.format(t.enrollmentRequests)}
            detail={`${number.format(t.accountRequests)} solicitudes de cuenta web`}
            hint="Solicitudes reales del periodo, incluidas las que no tienen atribución de visita. No equivalen a aprobaciones."
          />
        </div>
      </section>
      <section aria-labelledby="learning-heading">
        <h2 id="learning-heading" className="mb-5 text-xl font-semibold">
          Participación y operación actual
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Estudiantes activos semanalmente"
            value={number.format(l.weeklyActive)}
            detail={`${number.format(l.previousWeeklyActive)} en los 7 días anteriores · ${rate(l.weeklyActive, l.enrolledStudents)} participación`}
            hint="Estudiantes con matrícula activa que iniciaron o completaron lecciones, entregaron tareas o tuvieron asistencia verificada en los últimos 7 días."
          />
          <Kpi
            label="Estudiantes sin actividad · 14 días"
            value={number.format(l.inactiveStudents)}
            detail={`${number.format(l.neverActive)} sin actividad registrada desde su ingreso`}
            hint="Cuentas aprobadas con matrícula activa y al menos 14 días sin actividad académica. Los ingresos recientes no se marcan como inactivos."
          />
          <Kpi
            label="Entregas pendientes de calificar"
            value={number.format(l.ungradedSubmissions)}
            detail="Última versión por estudiante y tarea"
            hint="Una nueva entrega sin nota vuelve a requerir revisión. No se suman varias versiones del mismo trabajo."
          />
          <Kpi
            label="Estudiantes con matrícula activa"
            value={number.format(l.enrolledStudents)}
            detail={`${number.format(l.publishedCourses)} materias publicadas`}
            hint="Personas únicas con cuenta aprobada; cada estudiante cuenta una vez aunque curse varias materias."
          />
        </div>
      </section>
      <DecisionBrief data={data} user={user} />
      <section
        id="estudiantes-atencion"
        className="ui-card scroll-mt-24 overflow-hidden"
      >
        <div className="p-5 sm:p-7">
          <h2 className="text-xl font-semibold">
            Estudiantes para contactar primero
          </h2>
          <p className="mt-2 text-sm text-muted">
            Hasta 8 estudiantes: primero quienes no tienen actividad, después
            las fechas más antiguas.
          </p>
        </div>
        {l.students.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-sm">
              <caption className="sr-only">
                Estudiantes con inactividad académica
              </caption>
              <thead className="border-y border-line bg-surface-soft">
                <tr>
                  {["Estudiante", "Última actividad", "Seguimiento"].map(
                    (label) => (
                      <th
                        key={label}
                        scope="col"
                        className="px-5 py-3 font-medium"
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {l.students.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-line last:border-0"
                  >
                    <th scope="row" className="px-5 py-4 font-medium">
                      {student.name}
                    </th>
                    <td className="px-5 py-4 text-muted">
                      {student.lastActivityAt
                        ? day.format(new Date(student.lastActivityAt))
                        : "Sin actividad registrada"}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        className="text-link inline-flex min-h-11 items-center"
                        href={`${base}/seguimiento/${student.enrollmentId}`}
                      >
                        Ver expediente →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 pb-7 text-sm text-muted">
            No hay estudiantes que cumplan el criterio de 14 días de
            inactividad.
          </p>
        )}
      </section>
      <details className="ui-card p-5 text-sm">
        <summary className="cursor-pointer font-semibold">
          Cómo interpretar estos indicadores
        </summary>
        <div className="mt-4 space-y-3 leading-7 text-muted">
          <p>
            La captación usa días completos en UTC. La operación y la
            participación se consultan al abrir o actualizar el panel. Las dos
            semanas se calculan sobre los estudiantes matriculados actualmente.
          </p>
          <p>
            Las conversiones son navegadores del periodo con solicitudes
            posteriores a su visita; no incluyen atribución entre dispositivos
            ni visitas excluidas de medición. Una solicitud posterior al periodo
            no se atribuye retroactivamente. «—» significa que falta denominador
            o cobertura.
          </p>
          <p>
            Las sugerencias son reglas transparentes basadas en pendientes; no
            son predicciones ni decisiones automáticas. La inactividad no
            demuestra abandono y puede incluir problemas de acceso.
          </p>
          <p>
            Consulta generada:{" "}
            {new Intl.DateTimeFormat("es-BO", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: user.timeZone,
            }).format(new Date(data.generatedAt))}{" "}
            ({user.timeZone}). La preferencia de privacidad se gestiona desde el
            pie de página.
          </p>
        </div>
      </details>
    </>
  );
}

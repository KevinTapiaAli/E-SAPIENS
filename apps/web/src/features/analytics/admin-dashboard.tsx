import Link from "next/link";
import type { SessionUser } from "@esapiens/contracts";
import { readPrivateApi } from "@/features/auth/server";
import { isRecord } from "@/shared/api/public-api";
import { Icon, type IconName } from "@/shared/ui/icon";
import { PortalUnavailable } from "@/features/portal/portal-ui";
import { DashboardRefresh } from "@/features/portal/dashboard-refresh";
import { DataBars, DataDonut } from "./data-center-charts";

type Point = { label: string; value: number };
type Dashboard = {
  counts: Record<string, number>;
  studentsByCourse: Point[];
  enrollmentStates: Point[];
  teacherCourses: Point[];
  academicActivity: Point[];
  enrollmentTrend: Point[];
  generatedAt: string;
};
const keys = [
  "students",
  "teachers",
  "administrators",
  "courses",
  "enrollments",
  "requests",
  "activeStudents",
  "evaluations",
  "pendingGrading",
  "activity",
  "payments",
];
function isDashboard(v: unknown): v is Dashboard {
  return (
    isRecord(v) &&
    isRecord(v.counts) &&
    keys.every(
      (k) =>
        typeof v.counts === "object" &&
        v.counts !== null &&
        typeof (v.counts as Record<string, unknown>)[k] === "number",
    ) &&
    typeof v.generatedAt === "string" &&
    [
      "studentsByCourse",
      "enrollmentStates",
      "teacherCourses",
      "academicActivity",
      "enrollmentTrend",
    ].every(
      (k) =>
        Array.isArray(v[k]) &&
        v[k].every(
          (p: unknown) =>
            isRecord(p) &&
            typeof p.label === "string" &&
            typeof p.value === "number",
        ),
    )
  );
}
function Timeline({
  title,
  points,
  unit,
}: {
  title: string;
  points: Point[];
  unit: string;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const xy = (p: Point, i: number) =>
    `${30 + (i * 570) / Math.max(1, points.length - 1)},${145 - (p.value * 115) / max}`;
  return (
    <section className="ui-card min-w-0 p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-xs text-muted">
        {unit} · registros reales en la base local
      </p>
      <svg
        viewBox="0 0 630 175"
        className="mt-5 w-full text-brand"
        role="img"
        aria-label={`${title}. ${points.map((p) => `${p.label}: ${p.value}`).join("; ")}`}
      >
        <path d="M30 20V145H605" stroke="var(--line)" fill="none" />
        <polygon
          points={`30,145 ${points.map(xy).join(" ")} 600,145`}
          fill="var(--brand-soft)"
        />
        <polyline
          points={points.map(xy).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={30 + (i * 570) / Math.max(1, points.length - 1)}
            cy={145 - (p.value * 115) / max}
            r="4"
            fill="currentColor"
          >
            <title>
              {p.label}: {p.value}
            </title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between text-xs text-muted">
        <span>{points[0]?.label}</span>
        <span>Máximo: {max}</span>
        <span>{points.at(-1)?.label}</span>
      </div>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-brand">Ver valores</summary>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {points.map((p, i) => (
            <li key={i}>
              {p.label}: <strong>{p.value}</strong>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
export async function AdminDashboard({ user }: { user: SessionUser }) {
  const { data } = await readPrivateApi("academic/dashboard", isDashboard);
  if (!data) return <PortalUnavailable />;
  const cards: {
    key: string;
    label: string;
    icon: IconName;
    tone: string;
    href: string;
    note?: string;
  }[] = [
    {
      key: "students",
      label: "Estudiantes",
      icon: "users",
      tone: "blue",
      href: "usuarios?kind=estudiante",
    },
    {
      key: "teachers",
      label: "Docentes",
      icon: "user",
      tone: "violet",
      href: "docentes",
    },
    {
      key: "administrators",
      label: "Administradores",
      icon: "users",
      tone: "violet",
      href: "usuarios",
    },
    {
      key: "courses",
      label: "Materias publicadas",
      icon: "book",
      tone: "blue",
      href: "materias",
    },
    {
      key: "enrollments",
      label: "Matrículas activas",
      icon: "check",
      tone: "green",
      href: "matriculas",
    },
    {
      key: "requests",
      label: "Solicitudes pendientes",
      icon: "clock",
      tone: "amber",
      href: "inscripciones",
    },
    {
      key: "activeStudents",
      label: "Estudiantes activos",
      icon: "users",
      tone: "green",
      href: "datos?view=students",
      note: "Con actividad en los últimos 30 días",
    },
    {
      key: "evaluations",
      label: "Evaluaciones realizadas",
      icon: "clipboard",
      tone: "violet",
      href: "aula",
    },
    {
      key: "pendingGrading",
      label: "Entregas por calificar",
      icon: "clipboard",
      tone: "amber",
      href: "datos?view=reports",
    },
    {
      key: "activity",
      label: "Actividad académica",
      icon: "chart",
      tone: "blue",
      href: "datos",
      note: "Eventos registrados en 30 días",
    },
    {
      key: "payments",
      label: "Pagos pendientes",
      icon: "clock",
      tone: data.counts.payments ? "amber" : "green",
      href: "pagos",
    },
  ];
  return (
    <div className="space-y-7">
      <section className="admin-hero relative overflow-hidden rounded-3xl p-6 text-white sm:p-9">
        <div className="relative z-10 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">
            E-SAPIENS · Dirección académica
          </p>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
            Tu comunidad, en perspectiva.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-blue-50">
            Hola, {user.firstName}. Revisa el ciclo académico, acompaña a tus
            docentes y transforma los datos en decisiones.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/portal/administrador/datos"
              className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-900"
            >
              Abrir Centro de Datos →
            </Link>
            <Link
              href="/portal/administrador/aula"
              className="rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white"
            >
              Explorar aula virtual
            </Link>
          </div>
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Pulso de la institución</h2>
          <p className="mt-1 text-sm text-muted">
            Resumen actualizado de personas, materias y actividad académica.
          </p>
        </div>
        <DashboardRefresh />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards
          .filter(
            (c) => !["requests", "pendingGrading", "payments"].includes(c.key),
          )
          .map((c) => (
            <Link
              key={c.key}
              href={`/portal/administrador/${c.href}`}
              className={`admin-stat admin-stat-${c.tone} ui-card p-5 transition-transform hover:-translate-y-1`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-muted">
                  {c.label}
                </span>
                <span className="admin-stat-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  <Icon name={c.icon} />
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold tabular-nums">
                {data.counts[c.key]}
              </p>
              <p className="mt-2 text-xs text-muted">
                {c.note ?? "Consultar detalle →"}
              </p>
            </Link>
          ))}
      </div>
      <section
        aria-labelledby="admin-pending-heading"
        className="ui-card p-5 sm:p-6"
      >
        <p className="eyebrow">Pendientes</p>
        <h2 id="admin-pending-heading" className="mt-2 text-xl font-semibold">
          Qué necesita atención
        </h2>
        <p className="mt-2 text-sm text-muted">
          Abre cada pendiente para revisar el detalle antes de tomar una
          decisión.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {cards
            .filter(
              (c) =>
                ["requests", "pendingGrading", "payments"].includes(c.key) &&
                (c.key !== "payments" ||
                  user.permissions.includes("commerce.manage")),
            )
            .map((c) => (
              <Link
                key={c.key}
                href={`/portal/administrador/${c.href}`}
                className={`flex min-w-0 items-center gap-3 rounded-xl border p-4 ${data.counts[c.key] > 0 ? "border-warning/40 bg-warning-soft text-warning" : "border-line bg-success-soft text-success"}`}
              >
                <Icon name={data.counts[c.key] > 0 ? "clock" : "check"} />
                <span className="min-w-0 flex-1 text-sm font-semibold">
                  {c.label}
                  <span className="mt-1 block text-xs font-normal">
                    {data.counts[c.key] > 0
                      ? "Revisar pendientes →"
                      : "Sin pendientes registrados"}
                  </span>
                </span>
                <strong className="text-2xl tabular-nums">
                  {data.counts[c.key]}
                </strong>
              </Link>
            ))}
        </div>
      </section>
      <section
        aria-labelledby="admin-actions-heading"
        className="ui-card p-5 sm:p-6"
      >
        <h2 id="admin-actions-heading" className="text-xl font-semibold">
          Acciones rápidas
        </h2>
        <p className="mt-2 text-sm text-muted">
          Gestiona personas y materias, o descarga los resultados con los
          filtros de cada sección.
        </p>
        <nav
          aria-label="Acciones administrativas"
          className="mt-5 flex flex-wrap gap-3"
        >
          <Link
            href="/portal/administrador/usuarios?kind=estudiante"
            className="button button-secondary"
          >
            Estudiantes y Excel
          </Link>
          <Link
            href="/portal/administrador/docentes"
            className="button button-secondary"
          >
            Docentes y Excel
          </Link>
          <Link
            href="/portal/administrador/materias"
            className="button button-secondary"
          >
            Materias y matrículas
          </Link>
          {user.permissions.includes("identity.review") && (
            <Link
              href="/portal/administrador/solicitudes"
              className="button button-secondary"
            >
              Solicitudes de cuenta
            </Link>
          )}
          <Link
            href="/portal/administrador/datos?view=reports"
            className="button button-primary"
          >
            Reportes y CSV
          </Link>
        </nav>
      </section>
      <div>
        <h2 className="text-xl font-semibold">Información detallada</h2>
        <p className="mt-2 text-sm text-muted">
          Distribución y evolución del ciclo académico. Usa el Centro de Datos
          para aplicar filtros.
        </p>
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <DataBars
          title="Estudiantes por materia"
          points={data.studentsByCourse}
          unit="Estudiantes con matrícula activa"
          note="Cada estudiante se cuenta una vez por materia"
        />
        <DataDonut
          title="Estado de las matrículas"
          points={data.enrollmentStates.map((p) => ({
            ...p,
            label:
              (
                {
                  activa: "Activas",
                  suspendida: "Suspendidas",
                  abandonada: "Abandonadas",
                  cancelada: "Canceladas",
                } as Record<string, string>
              )[p.label] ?? p.label,
          }))}
        />
        <Timeline
          title="Actividad académica reciente"
          points={data.academicActivity}
          unit="Eventos por día · últimos 14 días"
        />
        <DataBars
          title="Distribución de docentes y materias"
          points={data.teacherCourses}
          unit="Materias asignadas"
          note="Asignaciones docentes vigentes"
        />
        {data.enrollmentTrend.filter((p) => p.value > 0).length > 1 && (
          <Timeline
            title="Evolución de inscripciones"
            points={data.enrollmentTrend}
            unit="Nuevas matrículas por semana"
          />
        )}
      </div>
    </div>
  );
}

import type { SessionUser, WorkspaceRole } from "@esapiens/contracts";
import type { IconName } from "@/shared/ui/icon";

export const roleLabels: Record<WorkspaceRole, string> = {
  administrador: "Administración",
  docente: "Docente",
  estudiante: "Estudiante",
};
export type PortalSection =
  | "resumen"
  | "informes"
  | "docentes"
  | "solicitudes"
  | "usuarios"
  | "cursos"
  | "matriculas"
  | "inscripciones"
  | "oferta"
  | "progreso"
  | "seguimiento"
  | "cuenta";
export function portalNavigation(
  role: WorkspaceRole,
  user: SessionUser,
): { section: PortalSection; label: string; icon: IconName; href: string }[] {
  const base = `/portal/${role}`;
  const items: { section: PortalSection; label: string; icon: IconName }[] = [
    {
      section: "resumen",
      label: role === "administrador" ? "Panel ejecutivo" : "Inicio",
      icon: "dashboard",
    },
  ];
  if (role === "administrador") {
    if (user.permissions.includes("identity.review"))
      items.push({
        section: "solicitudes",
        label: "Solicitudes de cuenta",
        icon: "check",
      });
    if (user.permissions.includes("academic.read"))
      items.push(
        { section: "usuarios", label: "Usuarios", icon: "users" },
        {
          section: "docentes",
          label: "Docentes y asignaciones",
          icon: "users",
        },
        { section: "cursos", label: "Materias y temarios", icon: "book" },
        {
          section: "inscripciones",
          label: "Inscripciones revisadas por docentes",
          icon: "check",
        },
        {
          section: "matriculas",
          label: "Matrículas y acceso",
          icon: "clipboard",
        },
        {
          section: "seguimiento",
          label: "Seguimiento de estudiantes",
          icon: "chart",
        },
      );
  } else {
    items.push({ section: "cursos", label: "Mis cursos", icon: "book" });
    if (role === "docente")
      items.push(
        {
          section: "inscripciones",
          label: "Solicitudes de inscripción",
          icon: "check",
        },
        {
          section: "seguimiento",
          label: "Mis estudiantes",
          icon: "users",
        },
      );
    if (role === "estudiante")
      items.push(
        { section: "oferta", label: "Inscribirme", icon: "clipboard" },
        { section: "progreso", label: "Mi progreso", icon: "chart" },
      );
  }
  items.push({
    section: "informes",
    label:
      role === "estudiante"
        ? "Consultar mi cárdex"
        : role === "administrador"
          ? "Análisis académico"
          : "Consultar indicadores",
    icon: "chart",
  });
  items.push({ section: "cuenta", label: "Mi cuenta", icon: "user" });
  return items.map((item) => ({
    ...item,
    href: item.section === "resumen" ? base : `${base}/${item.section}`,
  }));
}

export function portalSectionGroup(
  role: WorkspaceRole,
  section: PortalSection,
): string {
  if (section === "resumen") return "Mi espacio";
  if (section === "cuenta") return "Mi cuenta";
  if (["informes", "seguimiento", "progreso"].includes(section))
    return "Consultas y seguimiento";
  if (
    role === "administrador" &&
    ["usuarios", "solicitudes", "docentes"].includes(section)
  )
    return "Personas y acceso";
  return role === "estudiante"
    ? "Mi aprendizaje"
    : role === "docente"
      ? "Mi docencia"
      : "Gestión académica";
}
export function isWorkspaceRole(value: string): value is WorkspaceRole {
  return ["administrador", "docente", "estudiante"].includes(value);
}

export const statusLabels: Record<string, string> = {
  aprobado: "Aprobada",
  pendiente: "Pendiente",
  rechazado: "Rechazada",
  suspendido: "Suspendida",
  publicado: "Publicado",
  borrador: "Borrador",
  revision: "En revisión",
  archivado: "Archivado",
  activa: "Activa",
  suspendida: "Suspendida",
  abandonada: "Abandonada",
  cancelada: "Cancelada",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

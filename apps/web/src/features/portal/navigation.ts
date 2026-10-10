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

export const sectionDescriptions: Record<PortalSection, string> = {
  resumen: "Tus accesos y prioridades en un solo lugar.",
  informes: "Consulta resultados e indicadores académicos.",
  docentes: "Organiza las asignaciones y revisa los perfiles docentes.",
  solicitudes: "Revisa y responde las solicitudes de nuevas cuentas.",
  usuarios: "Encuentra personas y gestiona el estado de sus cuentas.",
  cursos: "Abre una materia para acceder a sus contenidos y actividades.",
  matriculas: "Gestiona las matrículas y las condiciones de acceso.",
  inscripciones: "Consulta las solicitudes de inscripción y su estado.",
  oferta: "Explora las materias disponibles y solicita tu inscripción.",
  progreso: "Identifica tus avances y lo que te falta completar.",
  seguimiento: "Consulta avances y detecta quién necesita acompañamiento.",
  cuenta: "Actualiza tus datos, fotografía y preferencias.",
};

export const workspaceGuides: Record<
  WorkspaceRole,
  {
    title: string;
    description: string;
    steps: string[];
    shortcuts: PortalSection[];
  }
> = {
  administrador: {
    title: "Gestiona lo que necesita atención",
    description:
      "Revisa solicitudes, organiza las materias y acompaña el avance académico.",
    steps: [
      "Revisa las prioridades del panel ejecutivo.",
      "Atiende las solicitudes y organiza docentes y matrículas.",
      "Usa el seguimiento para decidir a quién acompañar.",
    ],
    shortcuts: ["solicitudes", "cursos", "seguimiento", "matriculas"],
  },
  docente: {
    title: "Tu próxima clase empieza aquí",
    description:
      "Abre una materia para preparar materiales, crear tareas y revisar entregas.",
    steps: [
      "En Mis cursos, selecciona la materia que vas a trabajar.",
      "Organiza sus materiales y tareas, y revisa las entregas.",
      "Consulta Mis estudiantes para acompañar su avance.",
    ],
    shortcuts: ["cursos", "inscripciones", "seguimiento", "informes"],
  },
  estudiante: {
    title: "Continúa con tu aprendizaje",
    description:
      "Abre tus materias, encuentra tus tareas y consulta tu avance.",
    steps: [
      "En Mis cursos, abre una materia para continuar una lección.",
      "Entra en Tareas para consultar consignas y entregar tu trabajo.",
      "Abre el calendario lateral para ver tus próximos pendientes.",
    ],
    shortcuts: ["cursos", "progreso", "oferta", "informes"],
  },
};

export type PortalNavItem = {
  section: PortalSection;
  label: string;
  icon: IconName;
  href: string;
};

export function isPortalItemActive(
  pathname: string,
  item: PortalNavItem,
): boolean {
  return (
    pathname === item.href ||
    (item.section !== "resumen" && pathname.startsWith(`${item.href}/`))
  );
}
export function portalNavigation(
  role: WorkspaceRole,
  user: SessionUser,
): PortalNavItem[] {
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
          label: "Inscripciones",
          icon: "check",
        },
        {
          section: "matriculas",
          label: "Matrículas y acceso",
          icon: "clipboard",
        },
        {
          section: "seguimiento",
          label: "Seguimiento",
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
  if (role !== "administrador" || user.permissions.includes("academic.read"))
    items.push({
      section: "informes",
      label:
        role === "estudiante"
          ? "Mi cárdex"
          : role === "administrador"
            ? "Análisis académico"
            : "Indicadores",
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

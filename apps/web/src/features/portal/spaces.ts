import type { SessionUser, WorkspaceRole } from "@esapiens/contracts";
import { portalNavigation, type PortalNavItem } from "./navigation";

export type PortalSpace = "gestion" | "aula";
export const portalSpaces = {
  gestion: {
    title: "Gestión académica",
    description: "Materias, inscripciones, historial y pagos en un solo lugar.",
    icon: "clipboard",
  },
  aula: {
    title: "Aula virtual",
    description: "Contenidos, tareas, evaluaciones y avance del aprendizaje.",
    icon: "book",
  },
} as const;

export function currentPortalSpace(
  pathname: string,
  role: WorkspaceRole,
): PortalSpace | null {
  const [, section, ...rest] = pathname
    .replace(`/portal/${role}`, "")
    .split("/");
  if (!section || section === "cuenta") return null;
  if (
    section === "aula" ||
    ["progreso", "seguimiento", "biblioteca"].includes(section)
  )
    return "aula";
  if (section === "cursos") {
    if (role !== "administrador") return "aula";
    return rest.some((part) =>
      ["materiales", "tareas", "evaluaciones", "lecciones"].includes(part),
    )
      ? "aula"
      : "gestion";
  }
  return "gestion";
}

export function spaceNavigation(
  role: WorkspaceRole,
  user: SessionUser,
  space: PortalSpace | null,
): PortalNavItem[] {
  const base = `/portal/${role}`;
  if (!space)
    return [
      {
        section: "resumen",
        label: "Elegir espacio",
        icon: "dashboard",
        href: base,
      },
      ...(["gestion", "aula"] as const).map((section) => ({
        section,
        label: portalSpaces[section].title,
        icon: portalSpaces[section].icon,
        href: `${base}/${section}`,
      })),
      {
        section: "cuenta",
        label: "Mi cuenta",
        icon: "user",
        href: `${base}/cuenta`,
      },
    ];
  const items = portalNavigation(role, user).filter(
    (item) =>
      item.section === "cuenta" ||
      (item.section !== "resumen" &&
        currentPortalSpace(item.href, role) === space),
  );
  return [
    {
      section: "resumen",
      label: `Inicio · ${portalSpaces[space].title}`,
      icon: "dashboard",
      href: `${base}/${space}`,
    },
    ...items,
  ];
}

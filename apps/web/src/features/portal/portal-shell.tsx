"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { SessionUser, WorkspaceRole } from "@esapiens/contracts";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import { Icon } from "@/shared/ui/icon";
import { ProfileAvatar } from "./profile-photo";
import {
  isPortalItemActive,
  roleLabels,
  sectionDescriptions,
  workspaceGuides,
} from "./navigation";
import { PortalNavigation } from "./portal-navigation";
import { AgendaDrawer } from "./agenda-drawer";
import { VisitTracker } from "@/features/analytics/visit-tracker";
import { MeasurementPreference } from "@/features/analytics/measurement-preference";
import { currentPortalSpace, portalSpaces, spaceNavigation } from "./spaces";

export function PortalShell({
  user,
  role,
  roles,
  children,
}: {
  user: SessionUser;
  role: WorkspaceRole;
  roles: WorkspaceRole[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const menuId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const menuOpener = useRef<HTMLButtonElement | null>(null);
  const help = useRef<HTMLDetailsElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) dialog.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  useEffect(() => {
    dialog.current?.close();
    if (help.current) help.current.open = false;
  }, [pathname]);
  const space = currentPortalSpace(pathname, role);
  const items = spaceNavigation(role, user, space);
  const active = items.find((item) => isPortalItemActive(pathname, item));
  const base = `/portal/${role}`;
  const guide = space
    ? {
        description: portalSpaces[space].description,
        steps:
          space === "gestion"
            ? [
                "Abre Materias para consultar tu registro académico.",
                "Usa el menú para encontrar inscripciones, historial o pagos disponibles para tu perfil.",
                "Cambia al Aula virtual cuando quieras trabajar en contenidos y actividades.",
              ]
            : [
                "Selecciona una materia.",
                "Abre sus materiales, tareas o evaluaciones.",
                "Consulta tu progreso o el seguimiento de tus estudiantes.",
              ],
      }
    : workspaceGuides[role];
  const initials =
    `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  const mobileSections =
    space === "gestion"
      ? ["resumen", "materias", role === "docente" ? "inscripciones" : "pagos"]
      : space === "aula"
        ? [
            "resumen",
            "cursos",
            role === "estudiante" ? "progreso" : "seguimiento",
          ]
        : ["resumen", "gestion", "aula"];
  const mobileItems = mobileSections
    .flatMap((section) => items.filter((item) => item.section === section))
    .slice(0, 3);
  function openMenu(button: HTMLButtonElement) {
    menuOpener.current = button;
    dialog.current?.showModal();
    setMenuOpen(true);
  }
  function closeMenu() {
    dialog.current?.close();
  }

  return (
    <div className="min-h-screen bg-canvas pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-72">
      {space === "aula" && (
        <AgendaDrawer role={role} timeZone={user.timeZone} />
      )}
      {role === "estudiante" && pathname === "/portal/estudiante/oferta" && (
        <VisitTracker resource="/oferta" />
      )}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 overflow-y-auto border-r border-line bg-surface lg:block">
        <PortalNavigation
          key={space ?? "selector"}
          role={role}
          roles={roles}
          items={items}
          pathname={pathname}
          onNavigate={closeMenu}
        />
      </aside>
      <dialog
        ref={dialog}
        id={menuId}
        aria-label="Navegación del portal"
        className="portal-mobile-dialog"
        onClose={() => {
          setMenuOpen(false);
          if (menuOpener.current?.getClientRects().length)
            menuOpener.current.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu();
        }}
      >
        <PortalNavigation
          key={pathname}
          role={role}
          roles={roles}
          items={items}
          pathname={pathname}
          onNavigate={closeMenu}
          mobile
        />
      </dialog>
      <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-3 border-b border-line bg-surface px-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="icon-button lg:hidden"
            onClick={(event) => openMenu(event.currentTarget)}
            aria-label="Abrir navegación del portal"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            aria-controls={menuId}
          >
            <Icon name="menu" />
          </button>
          <div className="min-w-0">
            <p className="text-xs text-muted">
              {roleLabels[role]} ·{" "}
              {space ? portalSpaces[space].title : "Mis espacios"}
            </p>
            <p className="truncate text-sm font-semibold">
              {active?.label ??
                (space ? portalSpaces[space].title : "Mis espacios")}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href={`${base}/cuenta`}
            prefetch={false}
            className="flex min-h-11 items-center gap-3 rounded-lg"
            aria-label="Ver mi cuenta"
          >
            <span className="hidden max-w-40 truncate text-sm font-medium sm:block">
              {user.firstName} {user.lastName}
            </span>
            <ProfileAvatar initials={initials} />
          </Link>
        </div>
      </header>
      <nav
        aria-label="Cambiar de espacio"
        className="grid grid-cols-2 gap-2 border-b border-line bg-surface p-3 sm:px-8"
      >
        {(["gestion", "aula"] as const).map((option) => (
          <Link
            key={option}
            href={`${base}/${option}`}
            prefetch={false}
            aria-current={space === option ? "true" : undefined}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-center text-sm font-semibold ${space === option ? "bg-brand text-on-brand" : "bg-surface-soft text-muted hover:text-brand"}`}
          >
            <Icon name={portalSpaces[option].icon} />
            {portalSpaces[option].title}
          </Link>
        ))}
      </nav>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1600px] min-w-0 p-4 sm:p-8 lg:pr-14 xl:pl-10"
      >
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <nav
            aria-label="Ubicación actual"
            className="min-w-0 text-sm text-muted"
          >
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link
                  href={space ? `${base}/${space}` : base}
                  prefetch={false}
                  className="text-link inline-flex min-h-11 items-center"
                  aria-current={pathname === base ? "page" : undefined}
                >
                  {space ? portalSpaces[space].title : "Elegir espacio"}
                </Link>
              </li>
              {active && active.section !== "resumen" && (
                <li className="flex items-center gap-2">
                  <span aria-hidden="true">/</span>
                  <Link
                    href={active.href}
                    prefetch={false}
                    className="text-link inline-flex min-h-11 items-center"
                    aria-current={pathname === active.href ? "page" : undefined}
                  >
                    {active.label}
                  </Link>
                </li>
              )}
              {active && pathname !== active.href && (
                <li className="flex items-center gap-2">
                  <span aria-hidden="true">/</span>
                  <span aria-current="page">Detalle</span>
                </li>
              )}
            </ol>
          </nav>
          <details
            ref={help}
            className="max-w-xl rounded-xl border border-line bg-surface text-sm"
          >
            <summary className="min-h-11 cursor-pointer px-4 py-3 font-medium text-brand">
              Cómo usar este espacio
            </summary>
            <div className="border-t border-line p-4">
              <p className="text-muted">
                {active
                  ? sectionDescriptions[active.section]
                  : guide.description}
              </p>
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                {guide.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {space === "aula" && (
                <p className="mt-3 text-muted">
                  El botón Calendario muestra tu agenda y próximos pendientes.
                </p>
              )}
            </div>
          </details>
        </div>
        {children}
      </main>
      <footer className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-6 sm:px-8">
        <p className="text-xs text-muted">
          Tu espacio de formación y gestión · E-SAPIENS
        </p>
        <MeasurementPreference />
      </footer>
      <nav
        aria-label="Accesos principales"
        style={{
          gridTemplateColumns: `repeat(${mobileItems.length + 1}, minmax(0, 1fr))`,
        }}
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-surface px-2 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] lg:hidden"
      >
        {mobileItems.map((item) => (
          <Link
            key={item.section}
            href={item.href}
            prefetch={false}
            aria-current={
              isPortalItemActive(pathname, item) ? "page" : undefined
            }
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-center text-xs ${isPortalItemActive(pathname, item) ? "bg-brand-soft font-semibold text-brand" : "text-muted"}`}
          >
            <Icon name={item.icon} />
            <span>
              {item.section === "resumen"
                ? "Inicio"
                : item.section === "solicitudes"
                  ? "Solicitudes"
                  : item.label}
            </span>
          </Link>
        ))}
        <button
          type="button"
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs text-muted"
          onClick={(event) => openMenu(event.currentTarget)}
          aria-haspopup="dialog"
          aria-controls={menuId}
          aria-expanded={menuOpen}
        >
          <Icon name="menu" />
          Menú
        </button>
      </nav>
    </div>
  );
}

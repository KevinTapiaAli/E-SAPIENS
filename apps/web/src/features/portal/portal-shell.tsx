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
  portalNavigation,
  roleLabels,
  sectionDescriptions,
  workspaceGuides,
} from "./navigation";
import { PortalNavigation } from "./portal-navigation";
import { AgendaDrawer } from "./agenda-drawer";
import { VisitTracker } from "@/features/analytics/visit-tracker";
import { MeasurementPreference } from "@/features/analytics/measurement-preference";

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
  const items = portalNavigation(role, user);
  const active = items.find((item) => isPortalItemActive(pathname, item));
  const base = `/portal/${role}`;
  const guide = workspaceGuides[role];
  const initials =
    `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  const mobileSections = [
    "resumen",
    "cursos",
    role === "estudiante"
      ? "progreso"
      : role === "docente"
        ? "seguimiento"
        : "solicitudes",
    "cuenta",
  ];
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
      <AgendaDrawer role={role} timeZone={user.timeZone} />
      {role === "estudiante" && pathname === "/portal/estudiante/oferta" && (
        <VisitTracker resource="/oferta" />
      )}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 overflow-y-auto border-r border-line bg-surface lg:block">
        <PortalNavigation
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
            <p className="text-xs text-muted">{roleLabels[role]}</p>
            <p className="truncate text-sm font-semibold">
              {active?.label ?? "Portal"}
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
                  href={base}
                  prefetch={false}
                  className="text-link inline-flex min-h-11 items-center"
                  aria-current={pathname === base ? "page" : undefined}
                >
                  Inicio
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
              <p className="mt-3 text-muted">
                El botón Calendario del lateral derecho muestra tu agenda y
                próximos pendientes.
              </p>
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

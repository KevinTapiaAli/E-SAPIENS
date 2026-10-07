"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import type { SessionUser, WorkspaceRole } from "@esapiens/contracts";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import { Icon } from "@/shared/ui/icon";
import { LogoutButton } from "@/features/auth/logout-button";
import { ProfileAvatar } from "./profile-photo";
import { portalNavigation, portalSectionGroup, roleLabels } from "./navigation";
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
  const dialog = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) dialog.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  const items = portalNavigation(role, user);
  const groups = [
    ...new Set(items.map((item) => portalSectionGroup(role, item.section))),
  ];
  const isActive = (item: { section: string; href: string }) =>
    pathname === item.href ||
    (item.section !== "resumen" && pathname.startsWith(`${item.href}/`));
  const current = items.find(isActive)?.label ?? "Portal";
  const initials =
    `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  function navigation(mobile = false) {
    return (
      <div className="flex h-full flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/portal/${role}`}
            onClick={() => dialog.current?.close()}
            className="flex min-h-11 items-center gap-3 font-bold text-ink"
            aria-label="Inicio del portal E-SAPIENS"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-on-brand">
              <Icon name="book" />
            </span>
            E-SAPIENS
          </Link>
          {mobile && (
            <button
              type="button"
              className="icon-button"
              onClick={() => dialog.current?.close()}
              aria-label="Cerrar navegación"
            >
              <Icon name="close" />
            </button>
          )}
        </div>
        <p className="mt-8 px-3 text-xs font-semibold uppercase tracking-widest text-muted">
          Portal{" "}
          {role === "administrador"
            ? "administrativo"
            : role === "docente"
              ? "docente"
              : "del estudiante"}
        </p>
        <nav
          aria-label={
            mobile ? "Navegación móvil del portal" : "Navegación del portal"
          }
          className="mt-4 flex flex-col gap-1.5"
        >
          {groups.map((group) => (
            <div key={group} className="mb-3">
              <p className="mb-2 px-3 text-xs font-semibold text-muted">
                {group}
              </p>
              {items
                .filter(
                  (item) => portalSectionGroup(role, item.section) === group,
                )
                .map((item) => (
                  <Link
                    key={item.section}
                    href={item.href}
                    prefetch={false}
                    onClick={() => dialog.current?.close()}
                    aria-current={isActive(item) ? "page" : undefined}
                    className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium leading-5 transition-colors ${isActive(item) ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-soft hover:text-ink"}`}
                  >
                    <Icon name={item.icon} />
                    {item.label}
                  </Link>
                ))}
            </div>
          ))}
        </nav>
        {roles.length > 1 && (
          <div className="mt-7 border-t border-line pt-4">
            <p className="px-3 text-xs font-semibold uppercase tracking-widest text-muted">
              Otros perfiles
            </p>
            {roles
              .filter((item) => item !== role)
              .map((item) => (
                <Link
                  key={item}
                  href={`/portal/${item}`}
                  onClick={() => dialog.current?.close()}
                  className="nav-link mt-2 block"
                >
                  {roleLabels[item]}
                </Link>
              ))}
          </div>
        )}
        <div className="mt-auto pt-10">
          <div className="rounded-xl border border-line bg-surface-soft p-4">
            <p className="text-sm font-semibold">Explora E-SAPIENS</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Consulta la oferta de formación y la biblioteca pública.
            </p>
            <Link
              href="/"
              className="text-link mt-3 inline-flex min-h-11 items-center gap-2 text-sm"
            >
              Ir al sitio web
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
          <p className="px-2 pt-5 text-xs text-muted">
            E-SAPIENS · Plataforma educativa
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-canvas lg:pl-64">
      <AgendaDrawer role={role} timeZone={user.timeZone} />
      {role === "estudiante" && pathname === "/portal/estudiante/oferta" && (
        <VisitTracker resource="/oferta" />
      )}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 overflow-y-auto border-r border-line bg-surface lg:block">
        {navigation()}
      </aside>
      <dialog
        ref={dialog}
        aria-label="Navegación del portal"
        onClose={() => {
          if (menuButton.current?.getClientRects().length)
            menuButton.current.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        className="portal-mobile-dialog"
      >
        {navigation(true)}
      </dialog>
      <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-3 border-b border-line bg-surface px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            ref={menuButton}
            className="icon-button lg:hidden"
            onClick={() => dialog.current?.showModal()}
            aria-label="Abrir navegación del portal"
            aria-haspopup="dialog"
          >
            <Icon name="menu" />
          </button>
          <div>
            <p className="text-xs text-muted">{roleLabels[role]}</p>
            <p className="text-sm font-semibold">{current}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle />
          <Link
            href={`/portal/${role}/cuenta`}
            className="flex min-h-11 items-center gap-3 rounded-lg"
            aria-label="Ver mi cuenta"
          >
            <span className="hidden max-w-44 truncate text-sm font-medium sm:block">
              {user.firstName} {user.lastName}
            </span>
            <ProfileAvatar initials={initials} />
          </Link>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1600px] min-w-0 p-5 sm:p-8 xl:p-10"
      >
        {children}
      </main>
      <footer className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-6 sm:px-8">
        <p className="text-xs text-muted">
          Tu espacio de formación y gestión · E-SAPIENS
        </p>
        <LogoutButton />
        <MeasurementPreference />
      </footer>
    </div>
  );
}

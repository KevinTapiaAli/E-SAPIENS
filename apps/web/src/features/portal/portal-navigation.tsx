"use client";

import Link from "next/link";
import { useState } from "react";
import type { WorkspaceRole } from "@esapiens/contracts";
import { Icon } from "@/shared/ui/icon";
import { LogoutButton } from "@/features/auth/logout-button";
import {
  isPortalItemActive,
  portalSectionGroup,
  roleLabels,
  sectionDescriptions,
  type PortalNavItem,
} from "./navigation";

const searchable = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");

export function PortalNavigation({
  role,
  roles,
  items,
  pathname,
  onNavigate,
  mobile = false,
}: {
  role: WorkspaceRole;
  roles: WorkspaceRole[];
  items: PortalNavItem[];
  pathname: string;
  onNavigate: () => void;
  mobile?: boolean;
}) {
  const [query, setQuery] = useState("");
  const visible = items.filter((item) =>
    searchable(`${item.label} ${sectionDescriptions[item.section]}`).includes(
      searchable(query.trim()),
    ),
  );
  const groups = [
    ...new Set(visible.map((item) => portalSectionGroup(role, item.section))),
  ];
  return (
    <div className="flex min-h-full flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/portal/${role}`}
          onClick={onNavigate}
          prefetch={false}
          className="flex min-h-11 items-center gap-3 font-bold"
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
            onClick={onNavigate}
            aria-label="Cerrar navegación"
          >
            <Icon name="close" />
          </button>
        )}
      </div>
      <p className="mb-4 mt-6 rounded-lg bg-brand-soft px-3 py-2 text-sm font-semibold text-brand">
        {roleLabels[role]}
      </p>
      <label className="form-label text-sm">
        Buscar sección
        <input
          type="search"
          className="form-input"
          placeholder="Cursos, cuenta…"
          value={query}
          maxLength={80}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {query && (
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
          <p role="status">{visible.length} secciones</p>
          <button
            type="button"
            className="text-link min-h-11"
            onClick={() => setQuery("")}
          >
            Limpiar
          </button>
        </div>
      )}
      <nav
        aria-label={
          mobile ? "Navegación móvil del portal" : "Navegación del portal"
        }
        className="mt-5 space-y-5"
      >
        {groups.map((group) => (
          <div key={group}>
            <p className="mb-2 px-3 text-xs font-semibold text-muted">
              {group}
            </p>
            {visible
              .filter(
                (item) => portalSectionGroup(role, item.section) === group,
              )
              .map((item) => (
                <Link
                  key={item.section}
                  href={item.href}
                  prefetch={false}
                  onClick={onNavigate}
                  aria-current={
                    isPortalItemActive(pathname, item) ? "page" : undefined
                  }
                  className={`mb-1 flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium leading-5 transition-colors ${isPortalItemActive(pathname, item) ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-soft hover:text-ink"}`}
                >
                  <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              ))}
          </div>
        ))}
        {!visible.length && (
          <p className="rounded-xl bg-surface-soft p-4 text-sm text-muted">
            No hay una sección con ese nombre. Prueba con «cursos» o limpia la
            búsqueda.
          </p>
        )}
      </nav>
      {roles.length > 1 && (
        <div className="mt-6 border-t border-line pt-4">
          <p className="text-xs font-semibold text-muted">Cambiar de perfil</p>
          {roles
            .filter((item) => item !== role)
            .map((item) => (
              <Link
                key={item}
                href={`/portal/${item}`}
                prefetch={false}
                onClick={onNavigate}
                className="nav-link mt-2 block"
              >
                {roleLabels[item]}
              </Link>
            ))}
        </div>
      )}
      <div className="mt-6 space-y-4 border-t border-line pt-5">
        <Link
          href="/"
          prefetch={false}
          className="text-link inline-flex min-h-11 items-center gap-2 text-sm"
        >
          Ir al sitio público <Icon name="arrow" />
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
}

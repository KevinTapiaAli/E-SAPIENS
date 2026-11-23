"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { WorkspaceRole } from "@esapiens/contracts";
import { Icon } from "@/shared/ui/icon";
import { LogoutButton } from "@/features/auth/logout-button";
import { currentPortalSpace, portalSpaces } from "./spaces";
import { usePortalPreference } from "./use-portal-preference";
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
  compact = false,
}: {
  role: WorkspaceRole;
  roles: WorkspaceRole[];
  items: PortalNavItem[];
  pathname: string;
  onNavigate: () => void;
  mobile?: boolean;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const space = currentPortalSpace(pathname, role);
  const visible = items.filter((item) =>
    searchable(`${item.label} ${sectionDescriptions[item.section]}`).includes(
      searchable(query.trim()),
    ),
  );
  const groups = [
    ...new Set(visible.map((item) => portalSectionGroup(role, item.section))),
  ];
  return (
    <div className={`flex min-h-full flex-col ${compact ? "p-3" : "p-5"}`}>
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
          <span className={compact ? "sr-only" : undefined}>E-SAPIENS</span>
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
      <p
        className={
          compact
            ? "sr-only"
            : "mb-4 mt-6 rounded-lg bg-brand-soft px-3 py-2 text-sm font-semibold text-brand"
        }
      >
        {space ? portalSpaces[space].title : roleLabels[role]}
      </p>
      {!compact && (
        <label className="form-label text-sm">
          Buscar sección
          <input
            type="search"
            className="form-input"
            placeholder={
              space === "gestion"
                ? "Materias, pagos…"
                : space === "aula"
                  ? "Cursos, progreso…"
                  : "Elige tu espacio"
            }
            value={query}
            maxLength={80}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      )}
      {!compact && query && (
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
        className={compact ? "mt-5 space-y-2" : "mt-5 space-y-3"}
      >
        {(compact
          ? [
              ...new Set(
                items.map((item) => portalSectionGroup(role, item.section)),
              ),
            ]
          : groups
        ).map((group) => (
          <NavigationGroup
            key={group}
            group={group}
            role={role}
            space={space ?? "selector"}
            items={(compact ? items : visible).filter(
              (item) => portalSectionGroup(role, item.section) === group,
            )}
            pathname={pathname}
            onNavigate={onNavigate}
            compact={compact}
            searching={!compact && !!query.trim()}
          />
        ))}
        {!compact && !visible.length && (
          <p className="rounded-xl bg-surface-soft p-4 text-sm text-muted">
            No hay una sección con ese nombre. Prueba con «cursos» o limpia la
            búsqueda.
          </p>
        )}
      </nav>
      {roles.length > 1 && (
        <div className="mt-6 border-t border-line pt-4">
          <p
            className={compact ? "sr-only" : "text-xs font-semibold text-muted"}
          >
            Cambiar de perfil
          </p>
          {roles
            .filter((item) => item !== role)
            .map((item) => (
              <Link
                key={item}
                href={`/portal/${item}`}
                prefetch={false}
                onClick={onNavigate}
                className="nav-link mt-2 block"
                title={
                  compact ? `Cambiar al perfil ${roleLabels[item]}` : undefined
                }
              >
                {compact && <Icon name="user" />}
                <span className={compact ? "sr-only" : undefined}>
                  {roleLabels[item]}
                </span>
              </Link>
            ))}
        </div>
      )}
      <div className="mt-6 space-y-4 border-t border-line pt-5">
        <Link
          href={`/portal/${role}`}
          prefetch={false}
          onClick={onNavigate}
          className="text-link inline-flex min-h-11 items-center gap-2 text-sm"
          title={compact ? "Cambiar de espacio" : undefined}
        >
          <Icon name="dashboard" />
          <span className={compact ? "sr-only" : undefined}>
            Cambiar de espacio
          </span>
        </Link>
        <Link
          href="/"
          prefetch={false}
          className="text-link inline-flex min-h-11 items-center gap-2 text-sm"
          title={compact ? "Ir al sitio público" : undefined}
        >
          <Icon name="arrow" />
          <span className={compact ? "sr-only" : undefined}>
            Ir al sitio público
          </span>
        </Link>
        <LogoutButton compact={compact} />
      </div>
    </div>
  );
}

function NavigationGroup({
  group,
  role,
  space,
  items,
  pathname,
  onNavigate,
  compact,
  searching,
}: {
  group: string;
  role: WorkspaceRole;
  space: string;
  items: PortalNavItem[];
  pathname: string;
  onNavigate: () => void;
  compact: boolean;
  searching: boolean;
}) {
  const id = useId();
  const [closed, setClosed] = usePortalPreference(
    `esapiens:nav:${role}:${space}:${group}`,
  );
  const open = searching || !closed;
  const active = items.some((item) => isPortalItemActive(pathname, item));
  return (
    <div
      className={
        compact ? "border-t border-line pt-2 first:border-0" : undefined
      }
    >
      {compact ? (
        <p className="sr-only">{group}</p>
      ) : (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          className={`mb-1 flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-xs font-semibold ${active ? "text-brand" : "text-muted"}`}
          onClick={() => setClosed(searching ? false : !closed)}
          disabled={searching}
        >
          <span>
            {group}
            {active && !open && (
              <span className="sr-only"> · contiene la página actual</span>
            )}
          </span>
          <Icon
            name="arrow"
            className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`}
          />
        </button>
      )}
      <div id={id} hidden={!compact && !open}>
        {items.map((item) => (
          <Link
            key={item.section}
            href={item.href}
            prefetch={false}
            onClick={onNavigate}
            title={compact ? item.label : undefined}
            aria-current={
              isPortalItemActive(pathname, item) ? "page" : undefined
            }
            className={`mb-1 flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium leading-5 transition-colors ${compact ? "justify-center" : ""} ${isPortalItemActive(pathname, item) ? "bg-brand-soft font-semibold text-brand ring-1 ring-inset ring-brand/30" : "text-muted hover:bg-surface-soft hover:text-ink"}`}
          >
            <Icon name={item.icon} className="h-5 w-5" />
            <span className={compact ? "sr-only" : undefined}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

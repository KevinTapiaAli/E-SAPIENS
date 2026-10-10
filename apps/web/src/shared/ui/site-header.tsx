"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "./brand-mark";
import { ThemeToggle } from "./theme-toggle";
import { Icon } from "./icon";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/cursos", label: "Cursos" },
  { href: "/biblioteca", label: "Biblioteca" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const active = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  useEffect(() => {
    if (!menuOpen) return;
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !headerRef.current?.contains(event.target)
      )
        setMenuOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [menuOpen]);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b border-line bg-surface"
      onKeyDown={(event) => {
        if (event.key === "Escape" && menuOpen) {
          setMenuOpen(false);
          menuRef.current?.focus();
        }
      }}
    >
      <div className="page-shell flex min-h-20 items-center justify-between gap-3">
        <BrandMark />
        <div className="flex items-center gap-1 md:gap-3">
          <nav
            aria-label="Navegación principal"
            className="hidden items-center gap-1 md:flex"
          >
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={active(href) ? "page" : undefined}
                className="nav-link"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/login"
              aria-current={active("/login") ? "page" : undefined}
              className="nav-link ml-3 border border-input"
            >
              Acceso al aula
            </Link>
          </nav>
          <ThemeToggle />
          <button
            ref={menuRef}
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={
              menuOpen
                ? "Cerrar menú de navegación"
                : "Abrir menú de navegación"
            }
            className="icon-button md:hidden"
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
        </div>
      </div>
      <nav
        id="mobile-navigation"
        aria-label="Navegación móvil"
        hidden={!menuOpen}
        className="border-t border-line bg-surface md:hidden"
      >
        <div className="page-shell flex flex-col gap-1 py-4">
          {[...links, { href: "/login", label: "Acceso al aula" }].map(
            ({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={active(href) ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                className="nav-link"
              >
                {label}
              </Link>
            ),
          )}
        </div>
      </nav>
    </header>
  );
}

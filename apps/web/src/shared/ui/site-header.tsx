"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandMark } from "./brand-mark";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <BrandMark />

        {/* Navegación escritorio */}
        <nav
          aria-label="Navegación principal"
          className="hidden items-center gap-2 text-sm text-zinc-300 md:flex"
        >
          <Link
            href="/"
            className="rounded-lg px-3 py-2 transition hover:bg-zinc-900 hover:text-white"
          >
            Inicio
          </Link>

          <Link
            href="/cursos"
            className="rounded-lg px-3 py-2 transition hover:bg-zinc-900 hover:text-white"
          >
            Cursos
          </Link>

          <Link
            href="/biblioteca"
            className="rounded-lg px-3 py-2 transition hover:bg-zinc-900 hover:text-white"
          >
            Biblioteca
          </Link>

          <Link
            href="/login"
            className="ml-2 rounded-lg border border-zinc-700 px-4 py-2 font-medium transition hover:border-zinc-500 hover:bg-zinc-900"
          >
            Iniciar sesión
          </Link>
        </nav>

        {/* Botón móvil */}
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          aria-label={
            menuOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"
          }
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 text-zinc-200 transition hover:bg-zinc-900 md:hidden"
        >
          {menuOpen ? (
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Menú móvil */}
      {menuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Navegación móvil"
          className="border-t border-zinc-800 bg-zinc-950 px-6 pb-6 pt-4 md:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            <Link
              href="/"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
            >
              Inicio
            </Link>

            <Link
              href="/cursos"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
            >
              Cursos
            </Link>

            <Link
              href="/biblioteca"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
            >
              Biblioteca
            </Link>

            <Link
              href="/login"
              onClick={closeMenu}
              className="mt-2 rounded-xl bg-white px-4 py-3 text-center font-semibold text-zinc-950 transition hover:bg-zinc-200"
            >
              Iniciar sesión
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

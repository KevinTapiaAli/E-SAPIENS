import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/shared/ui/badge";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage() {
  return (
    <main className="brand-glow flex min-h-[calc(100vh-73px)] items-center justify-center bg-zinc-950 px-6 py-12 text-white">
      <section className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/80 p-7 shadow-2xl backdrop-blur sm:p-9">
        <Badge variant="brand">Acceso E-SAPIENS</Badge>

        <h1 className="mt-5 text-3xl font-bold tracking-tight">
          Bienvenido de nuevo
        </h1>

        <p className="mt-3 leading-7 text-zinc-400">
          Ingresa para continuar con tus cursos, actividades y progreso.
        </p>

        <form className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Correo electrónico
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              className="min-h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <label
                htmlFor="password"
                className="text-sm font-medium text-zinc-200"
              >
                Contraseña
              </label>

              <span className="text-xs text-zinc-500">Próximamente</span>
            </div>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Ingresa tu contraseña"
              className="min-h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400"
            />
          </div>

          <button
            type="button"
            className="min-h-12 w-full rounded-xl bg-violet-500 px-5 font-semibold text-white transition hover:bg-violet-400"
          >
            Iniciar sesión
          </button>
        </form>

        <div className="mt-7 border-t border-zinc-800 pt-6 text-center">
          <p className="text-sm text-zinc-500">¿Aún no tienes acceso?</p>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            El registro y aprobación de usuarios será habilitado durante el
            módulo de identidad.
          </p>

          <Link
            href="/"
            className="mt-5 inline-block text-sm font-medium text-violet-300 transition hover:text-violet-200"
          >
            ← Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}

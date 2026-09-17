import Link from "next/link";
import { getSystemHealth } from "@/shared/api/health";
import { ActionLink } from "@/shared/ui/action-link";

export default async function Home() {
  const health = await getSystemHealth();

  const systemReady =
    health?.status === "ok" &&
    health.dependencies.database.status === "up" &&
    health.dependencies.redis.status === "up";

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* HERO */}
      <section className="brand-glow relative overflow-hidden border-b border-zinc-900">
        {/* Resplandor decorativo */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-600/10 blur-3xl"
        />

        <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:py-28">
          {/* MENSAJE PRINCIPAL */}
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 px-4 py-2 text-sm text-zinc-300 backdrop-blur">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${
                  systemReady ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              Plataforma educativa E-SAPIENS
            </div>

            <h1 className="max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Aprende con claridad.
              <span className="brand-text block">Avanza con propósito.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-400">
              Encuentra tus cursos, clases, recursos y avances en un solo lugar.
              E-SAPIENS está pensado para que aprender sea sencillo, organizado
              y accesible.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <ActionLink href="/cursos">Explorar cursos</ActionLink>

              <ActionLink href="/login" variant="secondary">
                Iniciar sesión
              </ActionLink>
            </div>
          </div>

          {/* PANEL DERECHO */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-7 shadow-2xl backdrop-blur">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-300">
              Tu aprendizaje
            </p>

            <h2 className="mt-3 text-2xl font-semibold">
              Todo organizado para ti
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              Encuentra rápidamente lo que necesitas y continúa aprendiendo sin
              perder tu progreso.
            </p>

            <div className="mt-7 space-y-4">
              <div className="rounded-2xl border border-zinc-900 bg-zinc-950/80 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 font-semibold text-violet-300">
                    01
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">Cursos</p>

                    <p className="mt-1 font-medium">
                      Contenido organizado por módulos
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-900 bg-zinc-950/80 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 font-semibold text-violet-300">
                    02
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">Progreso</p>

                    <p className="mt-1 font-medium">
                      Continúa exactamente donde lo dejaste
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-900 bg-zinc-950/80 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 font-semibold text-cyan-300">
                    03
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">Recursos</p>

                    <p className="mt-1 font-medium">
                      Material académico fácil de encontrar
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ACCESOS RÁPIDOS */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-300">
            Accesos rápidos
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            ¿Qué quieres hacer hoy?
          </h2>

          <p className="mt-4 leading-7 text-zinc-400">
            Hemos organizado E-SAPIENS para que llegues a lo que necesitas con
            pocos pasos.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {/* CURSOS */}
          <Link
            href="/cursos"
            className="interactive-card group rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500 text-lg font-bold text-white">
              01
            </div>

            <h3 className="mt-6 text-xl font-semibold">Explorar cursos</h3>

            <p className="mt-3 leading-7 text-zinc-400">
              Descubre programas, áreas y nuevas oportunidades de aprendizaje.
            </p>

            <p className="mt-5 text-sm font-medium text-violet-300 transition group-hover:text-violet-200">
              Ver cursos →
            </p>
          </Link>

          {/* BIBLIOTECA */}
          <Link
            href="/biblioteca"
            className="interactive-card group rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800 text-lg font-bold text-zinc-200">
              02
            </div>

            <h3 className="mt-6 text-xl font-semibold">Consultar biblioteca</h3>

            <p className="mt-3 leading-7 text-zinc-400">
              Encuentra libros, documentos y bibliografía recomendada.
            </p>

            <p className="mt-5 text-sm font-medium text-violet-300 transition group-hover:text-violet-200">
              Ir a biblioteca →
            </p>
          </Link>

          {/* LOGIN */}
          <Link
            href="/login"
            className="interactive-card group rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800 text-lg font-bold text-zinc-200">
              03
            </div>

            <h3 className="mt-6 text-xl font-semibold">
              Continuar aprendiendo
            </h3>

            <p className="mt-3 leading-7 text-zinc-400">
              Ingresa para acceder a tus clases, progreso, evaluaciones y
              actividades.
            </p>

            <p className="mt-5 text-sm font-medium text-violet-300 transition group-hover:text-violet-200">
              Iniciar sesión →
            </p>
          </Link>
        </div>
      </section>

      {/* PROPUESTA DE VALOR */}
      <section className="border-y border-zinc-900 bg-zinc-900/30">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-300">
                Diseñado para aprender
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Menos complicaciones.
                <span className="block text-zinc-400">
                  Más enfoque en tu formación.
                </span>
              </h2>
            </div>

            <div className="space-y-5 text-zinc-400">
              <p className="leading-7">
                E-SAPIENS busca reducir pasos innecesarios y mantener cada
                elemento donde esperas encontrarlo.
              </p>

              <p className="leading-7">
                Tus cursos, materiales, clases y avances estarán organizados
                dentro de una experiencia consistente tanto en computadora como
                en dispositivos móviles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRINCIPIOS DE EXPERIENCIA */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-300">
              Experiencia E-SAPIENS
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              Pensado para que aprender sea más simple.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <h3 className="font-semibold">Navegación clara</h3>

              <p className="mt-2 leading-7 text-zinc-400">
                Menos menús innecesarios y accesos directos a las funciones que
                utilizas con mayor frecuencia.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <h3 className="font-semibold">Progreso visible</h3>

              <p className="mt-2 leading-7 text-zinc-400">
                Podrás reconocer rápidamente qué completaste y cuál es el
                siguiente paso de tu formación.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <h3 className="font-semibold">Contenido organizado</h3>

              <p className="mt-2 leading-7 text-zinc-400">
                Cursos, módulos, clases y recursos agrupados de una forma
                consistente y fácil de comprender.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <h3 className="font-semibold">Accesible desde cualquier lugar</h3>

              <p className="mt-2 leading-7 text-zinc-400">
                Una experiencia diseñada para funcionar correctamente en
                computadora, tablet y móvil.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-7xl px-6 pb-12">
        <div className="brand-glow overflow-hidden rounded-3xl border border-violet-500/20 bg-zinc-900/60 px-6 py-12 sm:px-10 lg:flex lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-300">
              Tu formación continúa aquí
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              Empieza a explorar E-SAPIENS.
            </h2>

            <p className="mt-4 leading-7 text-zinc-400">
              Descubre los cursos disponibles o inicia sesión para continuar con
              tu aprendizaje.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-4 lg:mt-0">
            <ActionLink href="/cursos">Ver cursos</ActionLink>

            <ActionLink href="/login" variant="secondary">
              Iniciar sesión
            </ActionLink>
          </div>
        </div>
      </section>

      {/* ESTADO DE PLATAFORMA */}
      <section className="mx-auto max-w-7xl px-6 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-900 bg-zinc-950 px-5 py-4 text-sm">
          <div>
            <p className="font-medium text-zinc-300">Estado de la plataforma</p>

            <p className="mt-1 text-zinc-500">
              Verificación automática de los servicios esenciales.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${
                systemReady ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />

            <span className="font-medium text-zinc-300">
              {systemReady
                ? "Plataforma disponible"
                : "Estamos verificando la plataforma"}
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

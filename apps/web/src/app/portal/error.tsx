"use client";
import Link from "next/link";
export default function PortalError({ reset }: { reset: () => void }) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      role="alert"
      className="ui-card mx-auto my-10 max-w-xl p-8"
    >
      <h1 className="text-2xl font-semibold">No pudimos cargar tu portal</h1>
      <p className="mt-3 text-muted">
        Comprueba la conexión e intenta nuevamente.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={reset} className="button button-primary">
          Reintentar
        </button>
        <Link href="/login" className="button button-secondary">
          Ir al acceso
        </Link>
      </div>
    </main>
  );
}

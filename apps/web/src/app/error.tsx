"use client";
import { StatePanel } from "@/shared/ui/state-panel";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main
      tabIndex={-1}
      id="main-content"
      className="mx-auto max-w-4xl px-6 py-16"
    >
      <h1 className="mb-8 text-3xl font-bold">
        No pudimos mostrar esta página
      </h1>
      <StatePanel
        type="error"
        title="Ocurrió un problema"
        description="Puedes intentarlo nuevamente."
        action={
          <button onClick={reset} className="button button-primary">
            Intentar de nuevo
          </button>
        }
      />
    </main>
  );
}

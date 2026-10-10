"use client";

import Link from "next/link";
import { StatePanel } from "@/shared/ui/state-panel";

export default function WorkspaceError({ reset }: { reset: () => void }) {
  return (
    <StatePanel
      as="h1"
      type="error"
      title="No pudimos cargar esta sección"
      description="Puedes reintentar o volver al inicio de tu espacio. La navegación sigue disponible."
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="button button-primary"
          >
            Volver a intentar
          </button>
          <Link
            href="/portal"
            prefetch={false}
            className="button button-secondary"
          >
            Ir a mi inicio
          </Link>
        </div>
      }
    />
  );
}

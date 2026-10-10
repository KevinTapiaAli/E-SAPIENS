"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function DashboardRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted" role="status">
        {pending
          ? "Consultando información…"
          : "Datos de esta consulta. Actualiza cuando necesites información más reciente."}
      </p>
      <button
        className="button button-secondary"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
      >
        {pending ? "Consultando…" : "Actualizar consulta"}
      </button>
    </div>
  );
}

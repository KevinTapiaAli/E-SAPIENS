"use client";
import { useState } from "react";
import { Icon } from "@/shared/ui/icon";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div>
      <button
        className="button button-secondary"
        disabled={pending}
        title={compact ? "Cerrar sesión" : undefined}
        onClick={async () => {
          setPending(true);
          setError(false);
          try {
            const response = await fetch("/api/identity/logout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: "{}",
              signal: AbortSignal.timeout(12000),
            });
            if (!response.ok) throw new Error();
            // A full navigation clears the client-side router cache of private views.
            window.location.replace("/login");
          } catch {
            setError(true);
            setPending(false);
          }
        }}
      >
        {compact && <Icon name="arrow" />}
        <span className={compact ? "sr-only" : undefined}>
          {pending ? "Cerrando sesión…" : "Cerrar sesión"}
        </span>
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          No se pudo cerrar la sesión. Intenta nuevamente.
        </p>
      )}
    </div>
  );
}

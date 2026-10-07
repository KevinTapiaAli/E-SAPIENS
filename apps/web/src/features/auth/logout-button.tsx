"use client";
import { useState } from "react";

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div>
      <button
        className="button button-secondary"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(false);
          try {
            const response = await fetch("/api/identity/logout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: "{}",
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
        {pending ? "Cerrando sesión…" : "Cerrar sesión"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          No se pudo cerrar la sesión. Intenta nuevamente.
        </p>
      )}
    </div>
  );
}

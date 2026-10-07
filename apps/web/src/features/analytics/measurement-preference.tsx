"use client";

import { useSyncExternalStore } from "react";

function subscribe(change: () => void) {
  window.addEventListener("measurement-preference", change);
  return () => window.removeEventListener("measurement-preference", change);
}
function optedOut() {
  return document.cookie.split("; ").includes("esapiens_measurement=off");
}

export function MeasurementPreference() {
  const disabled = useSyncExternalStore(subscribe, optedOut, () => true);
  return (
    <details className="text-xs text-muted">
      <summary className="inline-flex min-h-11 cursor-pointer items-center">
        Privacidad de visitas
      </summary>
      <p className="max-w-md leading-6">
        Estimamos visitas con una cookie propia de 30 días para mejorar cursos y
        navegación. Esta medición no almacena direcciones IP ni envía datos a
        terceros.
      </p>
      <button
        type="button"
        className="text-link min-h-11"
        onClick={() => {
          document.cookie = `esapiens_measurement=${disabled ? "on" : "off"}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
          window.dispatchEvent(new Event("measurement-preference"));
          if (!disabled)
            void fetch("/api/analytics/visit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: '{"path":"/"}',
            }).catch(() => undefined);
        }}
      >
        {disabled
          ? "Permitir medición de visitas"
          : "Desactivar medición de visitas"}
      </button>
    </details>
  );
}

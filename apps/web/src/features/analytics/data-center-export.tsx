"use client";
import { useState } from "react";

export function DataCenterExportButton({ query }: { query: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function download() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/analytics/data-center/export?${query}`,
        { cache: "no-store" },
      );
      if (!response.ok)
        throw new Error(
          response.status === 403 || response.status === 401
            ? "Tu sesión no permite esta exportación. Vuelve a ingresar con una cuenta autorizada."
            : "No se pudo generar el CSV. Reintenta cuando el servicio esté disponible.",
        );
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        response.headers
          .get("content-disposition")
          ?.match(/filename="([a-z0-9.-]+)"/i)?.[1] ?? "centro-datos.csv";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMessage(
        response.headers.get("x-export-truncated") === "true"
          ? "Descarga generada: primeros 5000 registros. Aplica más filtros para acotar los resultados."
          : `CSV generado: ${response.headers.get("x-export-rows") ?? "0"} registros.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo descargar el archivo.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        className="button button-primary"
        disabled={pending}
        onClick={download}
      >
        {pending ? "Generando CSV…" : "Descargar CSV"}
      </button>
      <p className="mt-2 max-w-lg text-xs text-muted" role="status">
        {message ||
          "Exporta todas las páginas con estos filtros, hasta 5000 filas. Fechas ISO UTC y celdas protegidas para Excel."}
      </p>
    </div>
  );
}

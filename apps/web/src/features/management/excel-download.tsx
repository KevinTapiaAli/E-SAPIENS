"use client";
import { useState } from "react";

export function ExcelDownload({
  kind,
  role = "administrador",
  q = "",
  state = "todos",
  courseId,
  label,
}: {
  kind: "docentes" | "estudiantes";
  role?: "administrador" | "docente";
  q?: string;
  state?: string;
  courseId?: string;
  label?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    setPending(true);
    setError("");
    try {
      const query = new URLSearchParams({
        role,
        q,
        state,
        ...(courseId ? { courseId } : {}),
      });
      const response = await fetch(`/api/exports/${kind}.xlsx?${query}`, {
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error(
          "No se pudo descargar el Excel. Revisa tu sesión y los filtros.",
        );
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        response.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? `esapiens-${kind}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "No se pudo descargar.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="my-4">
      <button
        className="button button-secondary"
        disabled={pending}
        onClick={() => void download()}
      >
        {pending ? "Generando Excel…" : (label ?? `Descargar ${kind} a Excel`)}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

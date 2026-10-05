"use client";
import { useRef, useState } from "react";
import type { WorkspaceRole } from "@esapiens/contracts";

export function CourseChoice({
  role,
  value = "",
  required = false,
}: {
  role: WorkspaceRole;
  value?: string;
  required?: boolean;
}) {
  const [selected, setSelected] = useState(value);
  const [label, setLabel] = useState(value ? "Materia seleccionada" : "");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<
    { id: string; title: string; category: string }[]
  >([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const current = useRef(0);
  async function find(next?: string) {
    const id = ++current.current;
    setBusy(true);
    setMessage("");
    try {
      const query = new URLSearchParams({
        role,
        q: search,
        ...(next ? { cursor: next } : {}),
      });
      const r = await fetch(`/api/academic/courses?${query}`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error();
      const data: unknown = await r.json();
      if (
        !data ||
        typeof data !== "object" ||
        !("items" in data) ||
        !Array.isArray(data.items)
      )
        throw new Error();
      const choices = data.items.filter(
        (v: unknown): v is { id: string; title: string; category: string } =>
          !!v &&
          typeof v === "object" &&
          "id" in v &&
          typeof v.id === "string" &&
          "title" in v &&
          typeof v.title === "string" &&
          "category" in v &&
          typeof v.category === "string",
      );
      if (current.current !== id) return;
      setItems(choices);
      setCursor(
        "nextCursor" in data && typeof data.nextCursor === "string"
          ? data.nextCursor
          : null,
      );
      if (!choices.length) setMessage("No hay materias para esta búsqueda.");
    } catch {
      if (current.current === id)
        setMessage("No se pudieron consultar las materias. Vuelve a buscar.");
    } finally {
      if (current.current === id) setBusy(false);
    }
  }
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="form-label mb-2">
        {required ? "1. Elige una materia" : "Materia"}
      </legend>
      <input type="hidden" name="courseId" value={selected} />
      <div className="flex flex-wrap gap-2">
        <label className="min-w-40 flex-1">
          <span className="sr-only">Buscar materia</span>
          <input
            className="form-input"
            placeholder="Nombre o categoría"
            maxLength={100}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void find();
              }
            }}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          className="button button-secondary"
          onClick={() => void find()}
        >
          {busy ? "Buscando…" : "Buscar materia"}
        </button>
      </div>
      <p className="text-sm text-muted">
        {selected
          ? label
          : required
            ? "Selecciona una materia para consultar sus estudiantes."
            : "Todas las materias de tu perfil"}
        {selected && (
          <button
            type="button"
            className="text-link ml-3"
            onClick={() => {
              setSelected("");
              setLabel("");
            }}
          >
            Cambiar
          </button>
        )}
      </p>
      {message && (
        <p role="status" className="text-sm text-muted">
          {message}
        </p>
      )}
      {!!items.length && (
        <ul className="max-h-64 overflow-y-auto rounded-xl border border-line">
          {items.map((item) => (
            <li key={item.id}>
              <button
                className={`w-full px-4 py-3 text-left text-sm hover:bg-brand-soft ${selected === item.id ? "bg-brand-soft" : ""}`}
                type="button"
                onClick={() => {
                  setSelected(item.id);
                  setLabel(item.title);
                  setItems([]);
                  setCursor(null);
                }}
              >
                <strong className="block">{item.title}</strong>
                <span className="text-muted">{item.category}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {cursor && (
        <button
          type="button"
          disabled={busy}
          className="text-link text-sm"
          onClick={() => void find(cursor)}
        >
          Más materias →
        </button>
      )}
    </fieldset>
  );
}

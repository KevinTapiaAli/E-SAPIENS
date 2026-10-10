"use client";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { actionFeedback } from "@/features/auth/action-feedback";

type Option = { id: string; label: string };
function AcademicPicker({
  kind,
  name,
  label,
}: {
  kind: "courses" | "estudiante" | "docente";
  name: string;
  label: string;
}) {
  const [query, setQuery] = useState("");
  const [loadedQuery, setLoadedQuery] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(
    async (q: string, nextCursor?: string) => {
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        q,
        limit: "12",
        ...(kind === "courses"
          ? { role: "administrador" }
          : { kind, state: "aprobado" }),
        ...(nextCursor ? { cursor: nextCursor } : {}),
      });
      try {
        const response = await fetch(
          `/api/academic/${kind === "courses" ? "courses" : "people"}?${params}`,
          { cache: "no-store", signal: current.signal },
        );
        const value: unknown = await response.json();
        if (
          !response.ok ||
          !value ||
          typeof value !== "object" ||
          !("items" in value) ||
          !Array.isArray(value.items)
        )
          throw new Error();
        const entries: Option[] = [];
        for (const item of value.items as unknown[]) {
          if (!item || typeof item !== "object") throw new Error();
          const record = item as Record<string, unknown>;
          if (typeof record.id !== "string") throw new Error();
          const text =
            kind === "courses" && typeof record.title === "string"
              ? `${record.title} · ${record.status === "publicado" ? "Publicado" : "No publicado"}`
              : typeof record.firstName === "string" &&
                  typeof record.lastName === "string" &&
                  typeof record.email === "string"
                ? `${record.firstName} ${record.lastName} · ${record.email}${kind === "docente" ? ` · ${typeof record.specialty === "string" ? record.specialty : "Sin especialidad"} · ${record.qualificationReviewedAt ? "Formación revisada" : "Falta revisión"}` : ""}`
                : null;
          if (!text) throw new Error();
          entries.push({ id: record.id, label: text });
        }
        if (current.signal.aborted) return;
        setOptions(entries);
        setLoadedQuery(q);
        setSelected("");
        setCursor(
          "nextCursor" in value && typeof value.nextCursor === "string"
            ? value.nextCursor
            : null,
        );
      } catch {
        if (!current.signal.aborted) {
          setError(
            "No se pudieron cargar las opciones. Intenta buscar nuevamente.",
          );
          setOptions([]);
          setSelected("");
          setCursor(null);
        }
      } finally {
        if (!current.signal.aborted) setLoading(false);
      }
    },
    [kind],
  );
  useEffect(() => {
    // Initial request and cancellation belong to this mounted picker.
    const timer = setTimeout(() => {
      void load("");
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.current?.abort();
    };
  }, [load]);
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void load(query);
            }
          }}
          maxLength={100}
          className="form-input mt-0 min-w-0"
          aria-label={`Buscar ${label.toLowerCase()}`}
          placeholder={
            kind === "courses"
              ? "Buscar por título"
              : "Buscar por nombre o correo"
          }
        />
        <button
          className="button button-secondary shrink-0 px-3"
          type="button"
          onClick={() => void load(query)}
        >
          Buscar
        </button>
      </div>
      <select
        aria-label={label}
        name={name}
        className="form-input mt-0"
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        required
        disabled={loading}
      >
        <option value="">
          {loading
            ? "Cargando opciones…"
            : options.length
              ? "Selecciona una opción"
              : "Sin coincidencias"}
        </option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <div
        className="flex flex-wrap gap-3 text-xs text-muted"
        aria-live="polite"
      >
        <p>
          {error ||
            (loading
              ? "Consultando…"
              : `${options.length} opciones en esta página.`)}
        </p>
        {cursor && (
          <button
            type="button"
            className="text-link min-h-11"
            onClick={() => void load(loadedQuery, cursor)}
          >
            Más resultados
          </button>
        )}
      </div>
    </fieldset>
  );
}

export function AcademicOperationForm({
  operation,
}: {
  operation: "enrollments" | "assignments";
}) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const router = useRouter();
  const enroll = operation === "enrollments";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/academic/${operation}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: data.get("personId"),
          courseId: data.get("courseId"),
          reason: data.get("reason"),
          ...(!enroll
            ? {
                qualificationConfirmed:
                  data.get("qualificationConfirmed") === "on",
              }
            : {}),
        }),
      });
      const result = actionFeedback((await response.json()) as unknown);
      setFeedback({
        ok: response.ok,
        message:
          result.code === "VALIDATION_ERROR"
            ? "Selecciona una persona, un curso y escribe un motivo de 5 a 500 caracteres."
            : result.message,
      });
      if (response.ok) router.refresh();
    } catch {
      setFeedback({
        ok: false,
        message: "No se pudo completar la operación. Intenta nuevamente.",
      });
    } finally {
      setPending(false);
    }
  }
  return (
    <details id="registrar" className="ui-card group mb-8 open:border-brand">
      <summary className="cursor-pointer px-6 py-5 font-semibold text-brand">
        {enroll ? "Registrar matrícula" : "Asignar docente a un curso"}
      </summary>
      <div className="border-t border-line p-6">
        <p className="max-w-3xl text-sm text-muted">
          {enroll
            ? "Selecciona un estudiante aprobado y un curso publicado. Esta matrícula administrativa no registra un pago ni concede por sí sola acceso a materiales privados."
            : "Revisa primero la formación del docente en el apartado Docentes. Selecciona una materia relacionada con su especialidad y deja el motivo de la asignación."}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-5" aria-busy={pending}>
          <div className="grid gap-6 xl:grid-cols-2">
            <AcademicPicker
              kind={enroll ? "estudiante" : "docente"}
              name="personId"
              label={enroll ? "Estudiante" : "Docente"}
            />
            <AcademicPicker kind="courses" name="courseId" label="Curso" />
          </div>
          <label className="form-label">
            Motivo
            <textarea
              className="form-input"
              name="reason"
              minLength={5}
              maxLength={500}
              required
              rows={2}
              placeholder="Describe la autorización o el motivo de esta operación."
            />
          </label>
          {!enroll && (
            <label className="flex items-start gap-3 text-sm">
              <input
                name="qualificationConfirmed"
                type="checkbox"
                required
                className="mt-1 h-4 w-4"
              />
              <span>
                He revisado su formación y confirmo que es adecuada para esta
                materia.{" "}
                <Link
                  href="/portal/administrador/docentes"
                  className="text-link"
                >
                  Consultar docentes
                </Link>
              </span>
            </label>
          )}
          {feedback && (
            <p
              role="status"
              className={`rounded-xl border p-4 text-sm ${feedback.ok ? "border-success bg-success-soft text-success" : "border-danger bg-danger-soft text-danger"}`}
            >
              {feedback.message}
            </p>
          )}
          {enroll && feedback?.ok && (
            <Link
              href="/portal/administrador/matriculas"
              className="text-link inline-flex min-h-11 items-center"
            >
              Abrir el registro para definir módulos y acceso →
            </Link>
          )}
          <button
            className="button button-primary disabled:opacity-60"
            disabled={pending}
          >
            {pending
              ? "Guardando…"
              : enroll
                ? "Confirmar matrícula"
                : "Confirmar asignación"}
          </button>
        </form>
      </div>
    </details>
  );
}

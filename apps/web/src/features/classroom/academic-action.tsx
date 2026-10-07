"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { actionFeedback } from "@/features/auth/action-feedback";

export function useAcademicAction(path: string) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    message: string;
    enrollmentId?: string;
  } | null>(null);
  async function submit(payload: Record<string, unknown>) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/academic/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: unknown = await response.json();
      const result = actionFeedback(data);
      const enrollmentId =
        data &&
        typeof data === "object" &&
        "enrollmentId" in data &&
        typeof data.enrollmentId === "string"
          ? data.enrollmentId
          : undefined;
      setFeedback({ ok: response.ok, message: result.message, enrollmentId });
      if (response.ok) router.refresh();
      return { ok: response.ok, data };
    } catch {
      setFeedback({
        ok: false,
        message:
          "No se pudo confirmar la operación. Puedes intentarlo nuevamente.",
      });
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return { pending, feedback, submit, clear: () => setFeedback(null) };
}

export function ActionFeedback({
  feedback,
}: {
  feedback: { ok: boolean; message: string; enrollmentId?: string } | null;
}) {
  return feedback ? (
    <div
      role="status"
      className={`mt-4 rounded-xl border p-4 text-sm ${feedback.ok ? "border-success bg-success-soft text-success" : "border-danger bg-danger-soft text-danger"}`}
    >
      <p>{feedback.message}</p>
      {feedback.ok && feedback.enrollmentId && (
        <Link
          className="text-link mt-3 inline-flex min-h-11 items-center"
          href={`/portal/administrador/matriculas/${feedback.enrollmentId}`}
        >
          Definir módulos y vigencia →
        </Link>
      )}
    </div>
  ) : null;
}

export function AcademicAction({
  path,
  label,
  payload = {},
  reason = false,
  review = false,
}: {
  path: string;
  label: string;
  payload?: Record<string, unknown>;
  reason?: boolean;
  review?: boolean;
}) {
  const action = useAcademicAction(path);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void action.submit({
      ...payload,
      ...(reason ? { reason: data.get("reason") } : {}),
      ...(review ? { decision: data.get("decision") } : {}),
    });
  }
  return (
    <form
      onSubmit={submit}
      className="mt-4 space-y-4"
      aria-busy={action.pending}
    >
      {review && (
        <label className="form-label">
          Decisión
          <select name="decision" className="form-input">
            <option value="aprobar">Aprobar inscripción</option>
            <option value="rechazar">Rechazar solicitud</option>
          </select>
        </label>
      )}
      {reason && (
        <label className="form-label">
          Motivo
          <textarea
            name="reason"
            className="form-input"
            required
            minLength={5}
            maxLength={500}
            rows={2}
            placeholder="Explica el motivo de esta decisión."
          />
        </label>
      )}
      <button
        disabled={action.pending}
        className="button button-primary disabled:opacity-60"
      >
        {action.pending ? "Guardando…" : label}
      </button>
      <ActionFeedback feedback={action.feedback} />
    </form>
  );
}

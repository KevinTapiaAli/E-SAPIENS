"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { PendingAccount } from "@esapiens/contracts";
import { actionFeedback } from "./action-feedback";
import { formatAccountDate } from "./format-date";

export function AccountReview({
  account,
  timeZone,
}: {
  account: PendingAccount;
  timeZone?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        `/api/identity/accounts/${account.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision: form.get("decision"),
            reason: form.get("reason"),
          }),
        },
      );
      const data = actionFeedback((await response.json()) as unknown);
      if (!response.ok)
        setMessage(
          data.code === "VALIDATION_ERROR"
            ? "Escribe un motivo de 5 a 500 caracteres y selecciona una decisión."
            : data.message,
        );
      else {
        setMessage(data.message);
        router.refresh();
      }
    } catch {
      setMessage("No pudimos conectar. Intenta nuevamente.");
    } finally {
      setPending(false);
    }
  }
  return (
    <article className="ui-card p-6">
      <h3 className="text-lg font-semibold">
        {account.firstName} {account.lastName}
      </h3>
      <p className="mt-1 break-all text-sm text-muted">{account.email}</p>
      <p className="mt-2 text-sm text-muted">
        Solicitud de estudiante ·{" "}
        {formatAccountDate(account.requestedAt, timeZone)}
      </p>
      <form
        onSubmit={submit}
        className="mt-5 space-y-4"
        aria-label={`Revisar solicitud de ${account.firstName} ${account.lastName}`}
        aria-busy={pending}
      >
        <label className="form-label">
          Decisión
          <select
            name="decision"
            className="form-input"
            defaultValue=""
            required
          >
            <option value="" disabled>
              Selecciona una decisión
            </option>
            <option value="aprobar">Aprobar acceso de estudiante</option>
            <option value="rechazar">Rechazar solicitud</option>
          </select>
        </label>
        <label className="form-label">
          Motivo de la decisión
          <textarea
            name="reason"
            required
            minLength={5}
            maxLength={500}
            rows={2}
            className="form-input"
            placeholder="Deja constancia de la revisión realizada."
          />
        </label>
        <button disabled={pending} className="button button-primary">
          {pending ? "Guardando…" : "Guardar decisión"}
        </button>
        <p role="status" className="text-sm text-muted">
          {message}
        </p>
      </form>
    </article>
  );
}

"use client";
import { useRef } from "react";
import type { WorkspaceRole } from "@esapiens/contracts";
import {
  ActionFeedback,
  useAcademicAction,
} from "@/features/classroom/academic-action";
export function ReminderForm({
  day,
  role,
  onSaved,
}: {
  day: string;
  role: WorkspaceRole;
  onSaved: () => void;
}) {
  const action = useAcademicAction(`agenda?role=${role}`, false);
  const operation = useRef<{ key: string; id: string } | null>(null);
  return (
    <form
      className="mt-5 space-y-3 border-t border-line pt-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        const payload = {
          title: String(f.get("title") ?? "").trim(),
          day: String(f.get("day") ?? ""),
        };
        const key = JSON.stringify(payload);
        if (operation.current?.key !== key)
          operation.current = { key, id: crypto.randomUUID() };
        const r = await action.submit({
          ...payload,
          operationId: operation.current.id,
        });
        if (r?.ok) {
          form.reset();
          operation.current = null;
          onSaved();
        }
      }}
    >
      <h3 className="font-semibold">Añadir recordatorio personal</h3>
      <label className="form-label">
        ¿Qué necesitas recordar?
        <input
          name="title"
          className="form-input"
          placeholder="Ej.: preparar la próxima clase"
          required
          minLength={3}
          maxLength={180}
          disabled={action.pending}
        />
      </label>
      <label className="form-label">
        Fecha
        <input
          name="day"
          type="date"
          className="form-input"
          defaultValue={day}
          min="2000-01-01"
          max="2099-12-31"
          required
          disabled={action.pending}
        />
      </label>
      <button className="button button-primary" disabled={action.pending}>
        {action.pending ? "Guardando…" : "Guardar recordatorio"}
      </button>
      <ActionFeedback feedback={action.feedback} />
    </form>
  );
}
export function ReminderToggle({
  id,
  done,
  role,
  onSaved,
}: {
  id: string;
  done: boolean;
  role: WorkspaceRole;
  onSaved: () => void;
}) {
  const action = useAcademicAction(`agenda/${id}?role=${role}`, false);
  return (
    <div>
      <button
        type="button"
        className="text-link inline-flex min-h-11 items-center text-sm"
        disabled={action.pending}
        onClick={async () => {
          const result = await action.submit({ done: !done });
          if (result?.ok) onSaved();
        }}
      >
        {action.pending ? "Guardando…" : done ? "Reabrir" : "Marcar como hecho"}
      </button>
      <ActionFeedback feedback={action.feedback} />
    </div>
  );
}

"use client";
import { useRef } from "react";
import {
  ActionFeedback,
  useAcademicAction,
} from "@/features/classroom/academic-action";
export function ReminderForm({ day }: { day: string }) {
  const action = useAcademicAction("agenda");
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
        }
      }}
    >
      <h3 className="font-semibold">Añadir recordatorio personal</h3>
      <label className="form-label">
        ¿Qué necesitas recordar?
        <input
          name="title"
          className="form-input"
          placeholder="Ej.: revisar matrículas pendientes"
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
export function ReminderToggle({ id, done }: { id: string; done: boolean }) {
  const action = useAcademicAction(`agenda/${id}`);
  return (
    <div>
      <button
        type="button"
        className="text-link inline-flex min-h-11 items-center text-sm"
        disabled={action.pending}
        onClick={() => void action.submit({ done: !done })}
      >
        {action.pending ? "Guardando…" : done ? "Reabrir" : "Marcar como hecho"}
      </button>
      <ActionFeedback feedback={action.feedback} />
    </div>
  );
}

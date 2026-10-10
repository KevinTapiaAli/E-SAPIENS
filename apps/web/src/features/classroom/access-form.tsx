"use client";
import { useRef, type FormEvent } from "react";
import type { EnrollmentAccess } from "@esapiens/contracts";
import { ActionFeedback, useAcademicAction } from "./academic-action";

export function AccessForm({ enrollment }: { enrollment: EnrollmentAccess }) {
  const action = useAcademicAction(`enrollments/${enrollment.id}/access`);
  const operation = useRef<{ id: string; payload: string } | null>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const moduleIds = data.getAll("moduleIds").map(String).sort();
    const first = form.querySelector<HTMLInputElement>(
      'input[name="moduleIds"]',
    );
    first?.setCustomValidity(
      moduleIds.length ? "" : "Selecciona al menos un módulo.",
    );
    if (!form.reportValidity()) return;
    const payload = {
      moduleIds,
      days: Number(data.get("days")),
      reason: String(data.get("reason") ?? "").trim(),
    };
    const serialized = JSON.stringify(payload);
    const previous = operation.current;
    const current =
      previous && previous.payload === serialized
        ? previous
        : { id: crypto.randomUUID(), payload: serialized };
    operation.current = current;
    void action.submit({ ...payload, operationId: current.id });
  }
  const modules = enrollment.modules.filter((module) => module.published);
  if (enrollment.status !== "activa")
    return (
      <p className="ui-card p-6 text-muted">
        La matrícula está inactiva. No se pueden añadir autorizaciones.
      </p>
    );
  if (!modules.length)
    return (
      <p className="ui-card p-6 text-muted">
        Esta materia todavía no tiene módulos publicados para autorizar.
      </p>
    );
  return (
    <section className="ui-card p-6 sm:p-8">
      <h2 className="text-xl font-semibold">Autorizar módulos</h2>
      <p className="mt-2 text-sm text-muted">
        Elige el contenido y su duración. El plazo comienza al confirmar. Los
        requisitos de materias previas y avance entre módulos se mantienen.
      </p>
      <form
        onSubmit={submit}
        className="mt-6 space-y-6"
        aria-busy={action.pending}
      >
        <fieldset className="space-y-3">
          <legend className="mb-3 font-semibold">Módulos incluidos</legend>
          {modules.map((module) => (
            <label
              key={module.id}
              className="flex min-h-12 items-start gap-3 rounded-xl border border-line p-4"
            >
              <input
                className="mt-1 h-5 w-5 shrink-0 accent-brand"
                type="checkbox"
                name="moduleIds"
                value={module.id}
                onChange={(event) => {
                  const first =
                    event.currentTarget.form?.querySelector<HTMLInputElement>(
                      'input[name="moduleIds"]',
                    );
                  first?.setCustomValidity("");
                }}
              />
              <span>
                {module.order}. {module.title}
              </span>
            </label>
          ))}
        </fieldset>
        <label className="form-label max-w-xs">
          Días de acceso
          <input
            name="days"
            type="number"
            required
            min={1}
            max={3650}
            defaultValue={30}
            className="form-input"
          />
          <span className="text-xs font-normal text-muted">
            Puedes cambiar el plazo antes de confirmar. Cada día equivale a 24
            horas.
          </span>
        </label>
        <label className="form-label">
          Motivo de la autorización
          <textarea
            className="form-input"
            name="reason"
            required
            minLength={5}
            maxLength={500}
            rows={3}
            placeholder="Por ejemplo: acceso institucional autorizado para el curso."
          />
        </label>
        <p className="text-sm text-muted">
          Esta autorización institucional no registra un cobro. Para renovar,
          registra otro período; el historial anterior se conserva.
        </p>
        <button
          className="button button-primary disabled:opacity-60"
          disabled={action.pending}
        >
          {action.pending ? "Autorizando…" : "Confirmar acceso"}
        </button>
        <ActionFeedback feedback={action.feedback} />
        {action.feedback?.ok && (
          <button
            type="button"
            className="text-link min-h-11"
            onClick={() => {
              operation.current = null;
              action.clear();
            }}
          >
            Preparar otra autorización
          </button>
        )}
      </form>
    </section>
  );
}

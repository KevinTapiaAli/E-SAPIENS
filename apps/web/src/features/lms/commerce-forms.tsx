"use client";
import { useRef, type FormEvent } from "react";
import {
  useAcademicAction,
  ActionFeedback,
} from "@/features/classroom/academic-action";
export function BuyPlan({ id, enabled }: { id: string; enabled: boolean }) {
  const operation = useRef<string | null>(null);
  const action = useAcademicAction("commerce/orders");
  return (
    <div>
      <button
        className="button button-primary"
        disabled={!enabled || action.pending}
        onClick={() => {
          operation.current ??= crypto.randomUUID();
          void action.submit({ planId: id, operationId: operation.current });
        }}
      >
        {action.pending ? "Registrando…" : "Crear orden de compra"}
      </button>
      <ActionFeedback feedback={action.feedback} />
    </div>
  );
}
export function PaymentForm({ id }: { id: string }) {
  const action = useAcademicAction(`commerce/orders/${id}/payment`);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void action.submit({
      method: data.get("method"),
      reference: data.get("reference"),
    });
  }
  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <label className="form-label">
        Medio de pago
        <select name="method" className="form-input">
          <option value="transferencia">Transferencia bancaria</option>
          <option value="qr">QR institucional</option>
        </select>
      </label>
      <label className="form-label">
        Referencia de la transacción
        <input
          name="reference"
          required
          minLength={6}
          maxLength={100}
          className="form-input"
          autoComplete="off"
        />
      </label>
      <p className="text-sm text-muted">
        Registra el código del banco. Administración verificará el ingreso antes
        de habilitar el acceso. No envíes contraseñas ni números de tarjeta.
      </p>
      <button disabled={action.pending} className="button button-primary">
        Enviar a revisión
      </button>
      <ActionFeedback feedback={action.feedback} />
    </form>
  );
}
export function PaymentReview({ id }: { id: string }) {
  const action = useAcademicAction(`commerce/payments/${id}/review`);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void action.submit({
      decision: data.get("decision"),
      reason: data.get("reason"),
    });
  }
  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <label className="form-label">
        Decisión
        <select name="decision" className="form-input">
          <option value="rechazar">Rechazar referencia</option>
          <option value="confirmar">Confirmar ingreso verificado</option>
        </select>
      </label>
      <label className="form-label">
        Motivo (visible para el estudiante)
        <textarea
          required
          minLength={10}
          maxLength={500}
          name="reason"
          className="form-input"
        />
      </label>
      <label className="flex gap-2">
        <input type="checkbox" required />
        He cotejado la referencia, el importe y la moneda con el banco.
      </label>
      <button disabled={action.pending} className="button button-primary">
        Registrar decisión
      </button>
      <ActionFeedback feedback={action.feedback} />
    </form>
  );
}
export function PlanForm({
  courses,
}: {
  courses: { id: string; title: string }[];
}) {
  const action = useAcademicAction("commerce/plans");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const d = new FormData(event.currentTarget);
    void action.submit({
      courseId: d.get("courseId"),
      name: d.get("name"),
      price: Number(d.get("price")).toFixed(2),
      currency: d.get("currency"),
      days: Number(d.get("days")),
    });
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="form-label">
        Materia publicada
        <select required name="courseId" className="form-input">
          <option value="">Selecciona una materia</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </label>
      <label className="form-label">
        Nombre del plan
        <input
          name="name"
          required
          minLength={5}
          maxLength={120}
          className="form-input"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="form-label">
          Precio
          <input
            name="price"
            type="number"
            required
            min="0.01"
            max="999999.99"
            step="0.01"
            className="form-input"
          />
        </label>
        <label className="form-label">
          Moneda
          <select name="currency" className="form-input">
            <option>BOB</option>
            <option>USD</option>
          </select>
        </label>
        <label className="form-label">
          Días de acceso
          <input
            name="days"
            type="number"
            required
            min={1}
            max={3650}
            defaultValue={90}
            className="form-input"
          />
        </label>
      </div>
      <p className="text-sm text-muted">
        Incluye los módulos publicados actuales. El precio y la cobertura se
        conservan en cada compra.
      </p>
      <button
        disabled={action.pending || !courses.length}
        className="button button-primary"
      >
        Publicar plan
      </button>
      <ActionFeedback feedback={action.feedback} />
    </form>
  );
}

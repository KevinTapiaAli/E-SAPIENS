"use client";
import { useRef, useState, type FormEvent } from "react";
import type {
  TeachingCourse,
  TeachingMaterial,
  TeachingTask,
} from "@esapiens/contracts";
import {
  ActionFeedback,
  useAcademicAction,
} from "@/features/classroom/academic-action";
import { SaveButton } from "@/features/management/editor-forms";

function ModuleField({
  modules,
  value,
}: {
  modules: TeachingCourse["modules"];
  value?: string;
}) {
  return (
    <label className="form-label">
      Módulo
      <select
        name="moduleId"
        className="form-input"
        defaultValue={value ?? ""}
        required
      >
        <option value="">Selecciona un módulo</option>
        {modules.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
            {m.published ? "" : " · Sin publicar"}
          </option>
        ))}
      </select>
    </label>
  );
}
function LinkField({
  value = "",
  label = "Enlace HTTPS (opcional)",
}: {
  value?: string;
  label?: string;
}) {
  return (
    <label className="form-label">
      {label}
      <input
        className="form-input"
        type="url"
        pattern="https://.*"
        name="url"
        maxLength={2000}
        defaultValue={value}
        placeholder="https://…"
      />
      <span className="text-xs font-normal text-muted">
        Puedes enlazar un documento, video o recurso compartido. El destinatario
        necesitará permiso para abrirlo.
      </span>
    </label>
  );
}
export function MaterialEditor({
  courseId,
  modules,
  material,
}: {
  courseId: string;
  modules: TeachingCourse["modules"];
  material?: TeachingMaterial;
}) {
  const action = useAcademicAction(
    `teaching/${courseId}/materials${material ? `/${material.id}` : ""}`,
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const result = await action.submit({
      moduleId: f.get("moduleId"),
      title: f.get("title"),
      kind: f.get("kind"),
      content: f.get("content"),
      url: f.get("url"),
      published: f.get("published") === "on",
      ...(material ? { revision: material.revision } : {}),
    });
    if (result?.ok && !material) form.reset();
  }
  return (
    <details className="ui-card p-5">
      <summary className="cursor-pointer py-2 font-semibold text-brand">
        {material ? "Editar material" : "Añadir material"}
      </summary>
      <form
        onSubmit={submit}
        className="mt-4 space-y-4"
        aria-busy={action.pending}
      >
        <fieldset disabled={action.pending} className="space-y-4">
          <ModuleField modules={modules} value={material?.moduleId} />
          <label className="form-label">
            Título
            <input
              name="title"
              className="form-input"
              required
              minLength={3}
              maxLength={180}
              defaultValue={material?.title}
            />
          </label>
          <label className="form-label">
            Tipo de material
            <select
              name="kind"
              className="form-input"
              defaultValue={material?.kind ?? "apoyo"}
            >
              <option value="apoyo">Material de apoyo</option>
              <option value="contenido">Contenido para avanzar</option>
              <option value="referencia">Referencia</option>
            </select>
          </label>
          <label className="form-label">
            Contenido o indicaciones
            <textarea
              name="content"
              className="form-input"
              rows={6}
              maxLength={12000}
              defaultValue={material?.content}
            />
          </label>
          <LinkField value={material?.url ?? ""} />
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="published"
              defaultChecked={material?.published}
              className="h-4 w-4 accent-brand"
            />
            Publicar para estudiantes con acceso al módulo
          </label>
          <p className="text-xs text-muted">
            Desmarca la publicación para retirar el material del aula sin
            eliminarlo.
          </p>
          <SaveButton pending={action.pending} label="Guardar material" />
        </fieldset>
        <ActionFeedback feedback={action.feedback} />
      </form>
    </details>
  );
}
export function TaskEditor({
  courseId,
  modules,
  task,
}: {
  courseId: string;
  modules: TeachingCourse["modules"];
  task?: TeachingTask;
}) {
  const action = useAcademicAction(
    `teaching/${courseId}/tasks${task ? `/${task.id}` : ""}`,
  );
  const [editDate, setEditDate] = useState(!task);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const result = await action.submit({
      moduleId: f.get("moduleId"),
      title: f.get("title"),
      instructions: f.get("instructions"),
      dueAt: editDate
        ? new Date(String(f.get("dueAt"))).toISOString()
        : task!.dueAt,
      allowLate: f.get("allowLate") === "on",
      maxSubmissions: Number(f.get("maxSubmissions")),
      published: f.get("published") === "on",
      ...(task ? { revision: task.revision } : {}),
    });
    if (result?.ok && !task) form.reset();
  }
  return (
    <details className="ui-card p-5">
      <summary className="cursor-pointer py-2 font-semibold text-brand">
        {task ? "Editar tarea" : "Crear tarea"}
      </summary>
      <form
        onSubmit={submit}
        className="mt-4 space-y-4"
        aria-busy={action.pending}
      >
        <fieldset disabled={action.pending} className="space-y-4">
          <ModuleField modules={modules} value={task?.moduleId} />
          <label className="form-label">
            Título
            <input
              name="title"
              className="form-input"
              required
              minLength={3}
              maxLength={180}
              defaultValue={task?.title}
            />
          </label>
          <label className="form-label">
            Instrucciones
            <textarea
              name="instructions"
              className="form-input"
              required
              minLength={5}
              maxLength={12000}
              rows={6}
              defaultValue={task?.instructions}
            />
          </label>
          {task && (
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={editDate}
                onChange={(e) => setEditDate(e.target.checked)}
              />
              Cambiar fecha límite
            </label>
          )}
          {editDate && (
            <label className="form-label">
              Fecha límite
              <input
                type="datetime-local"
                name="dueAt"
                required
                className="form-input"
              />
              <span className="text-xs font-normal text-muted">
                Se utilizará la zona horaria de este dispositivo.
              </span>
            </label>
          )}
          <label className="form-label">
            Intentos permitidos
            <input
              type="number"
              name="maxSubmissions"
              min={1}
              max={20}
              defaultValue={task?.maxSubmissions ?? 2}
              required
              className="form-input"
            />
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="allowLate"
              defaultChecked={task?.allowLate}
              className="h-4 w-4"
            />
            Aceptar entregas fuera de plazo
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="published"
              defaultChecked={task?.published}
              className="h-4 w-4"
            />
            Publicar tarea para estudiantes con acceso
          </label>
          <SaveButton pending={action.pending} label="Guardar tarea" />
        </fieldset>
        <ActionFeedback feedback={action.feedback} />
      </form>
    </details>
  );
}
export function SubmitTaskForm({
  courseId,
  taskId,
}: {
  courseId: string;
  taskId: string;
}) {
  const action = useAcademicAction(
    `teaching/${courseId}/tasks/${taskId}/submissions`,
  );
  const operation = useRef<{ payload: string; id: string } | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const payload = {
      text: String(f.get("text") ?? ""),
      comment: String(f.get("comment") ?? ""),
      url: String(f.get("url") ?? ""),
    };
    const signature = JSON.stringify(payload);
    if (operation.current?.payload !== signature)
      operation.current = { payload: signature, id: crypto.randomUUID() };
    const result = await action.submit({
      ...payload,
      operationId: operation.current.id,
    });
    if (result?.ok) {
      form.reset();
      operation.current = null;
    }
  }
  return (
    <section className="ui-card p-6">
      <h2 className="text-xl font-semibold">Enviar mi trabajo</h2>
      <p className="mt-2 text-sm text-muted">
        Escribe tu respuesta o enlaza tu trabajo. Puedes acompañarlo de un
        comentario para el docente. Cada envío confirmado utiliza un intento.
      </p>
      <form
        onSubmit={submit}
        className="mt-5 space-y-4"
        aria-busy={action.pending}
      >
        <fieldset disabled={action.pending} className="space-y-4">
          <label className="form-label">
            Trabajo o respuesta
            <textarea
              name="text"
              rows={7}
              maxLength={12000}
              className="form-input"
            />
          </label>
          <LinkField label="Enlace a mi trabajo (opcional)" />
          <label className="form-label">
            Comentario para el docente (opcional)
            <textarea
              name="comment"
              rows={3}
              maxLength={3000}
              className="form-input"
              placeholder="Explica tu entrega, comparte una duda o indica algo que deba revisar."
            />
          </label>
          <SaveButton
            pending={action.pending}
            label="Enviar trabajo y comentario"
          />
        </fieldset>
        <ActionFeedback feedback={action.feedback} />
      </form>
    </section>
  );
}
export function FeedbackForm({ path }: { path: string }) {
  const action = useAcademicAction(path);
  const operation = useRef<{ text: string; id: string } | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const comment = String(new FormData(form).get("comment") ?? "");
    if (operation.current?.text !== comment)
      operation.current = { text: comment, id: crypto.randomUUID() };
    const r = await action.submit({
      comment,
      operationId: operation.current.id,
    });
    if (r?.ok) {
      form.reset();
      operation.current = null;
    }
  }
  return (
    <form
      onSubmit={submit}
      className="mt-4 space-y-3"
      aria-busy={action.pending}
    >
      <label className="form-label">
        Respuesta del docente
        <textarea
          name="comment"
          rows={3}
          required
          minLength={3}
          maxLength={3000}
          className="form-input"
          disabled={action.pending}
        />
      </label>
      <SaveButton pending={action.pending} label="Enviar comentario" />
      <ActionFeedback feedback={action.feedback} />
    </form>
  );
}

export function GradeForm({
  path,
  grade,
}: {
  path: string;
  grade: number | null;
}) {
  const action = useAcademicAction(path);
  return (
    <form
      className="mt-5 grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[150px_1fr]"
      aria-busy={action.pending}
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        await action.submit({
          grade: Number(data.get("grade")),
          expectedGrade: grade,
          reason: String(data.get("reason")),
        });
      }}
    >
      <label className="form-label">
        Puntaje / 100
        <input
          type="number"
          name="grade"
          className="form-input"
          min={0}
          max={100}
          step="0.01"
          required
          defaultValue={grade ?? ""}
          disabled={action.pending}
        />
      </label>
      <label className="form-label">
        Explicación de la nota
        <input
          name="reason"
          className="form-input"
          minLength={3}
          maxLength={3000}
          required
          disabled={action.pending}
        />
      </label>
      <SaveButton pending={action.pending} label="Guardar nota" />
      <ActionFeedback feedback={action.feedback} />
    </form>
  );
}

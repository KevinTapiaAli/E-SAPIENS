"use client";
import { type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type {
  ManagedCourse,
  ManagedModule,
  ManagedLesson,
} from "@esapiens/contracts";
import {
  ActionFeedback,
  useAcademicAction,
} from "@/features/classroom/academic-action";

export function ReasonField() {
  return (
    <label className="form-label">
      Motivo del cambio
      <textarea
        name="reason"
        className="form-input"
        required
        minLength={5}
        maxLength={500}
        rows={2}
        placeholder="Describe la autorización o el cambio realizado."
      />
    </label>
  );
}
export function SaveButton({
  pending,
  label = "Guardar cambios",
}: {
  pending: boolean;
  label?: string;
}) {
  return (
    <button
      className="button button-primary disabled:opacity-60"
      disabled={pending}
    >
      {pending ? "Guardando…" : label}
    </button>
  );
}

export function CourseEditor({
  course,
  canEdit = true,
}: {
  course?: ManagedCourse;
  canEdit?: boolean;
}) {
  const action = useAcademicAction(
    course ? `management/courses/${course.id}` : "management/courses",
  );
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const result = await action.submit({
      title: value("title"),
      category: value("category"),
      description: value("description"),
      objectives: value("objectives"),
      level: value("level"),
      durationHours: Number(data.get("durationHours")),
      status: course ? value("status") : "borrador",
      requireLessons: course?.enrolled
        ? course.requireLessons
        : data.get("requireLessons") === "on",
      exam: course?.enrolled ? course.exam : value("exam"),
      reason: value("reason"),
      ...(course ? { revision: course.revision } : {}),
    });
    if (
      !course &&
      result?.ok &&
      result.data &&
      typeof result.data === "object" &&
      "courseId" in result.data &&
      typeof result.data.courseId === "string" &&
      /^[a-f0-9-]{36}$/i.test(result.data.courseId)
    )
      router.push(`/portal/administrador/cursos/${result.data.courseId}`);
  }
  return (
    <form onSubmit={submit} aria-busy={action.pending} className="space-y-5">
      <fieldset
        disabled={!canEdit || action.pending}
        className="space-y-5 disabled:opacity-70"
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="form-label">
            Nombre de la materia
            <input
              name="title"
              defaultValue={course?.title}
              className="form-input"
              required
              minLength={3}
              maxLength={180}
            />
          </label>
          <label className="form-label">
            Categoría existente o nueva
            <input
              name="category"
              defaultValue={course?.category}
              className="form-input"
              required
              minLength={2}
              maxLength={100}
            />
          </label>
        </div>
        <label className="form-label">
          Descripción
          <textarea
            name="description"
            defaultValue={course?.description}
            className="form-input"
            rows={3}
            required
            minLength={10}
            maxLength={4000}
          />
        </label>
        <label className="form-label">
          Objetivos de aprendizaje
          <textarea
            name="objectives"
            defaultValue={course?.objectives}
            className="form-input"
            rows={3}
            required
            minLength={5}
            maxLength={4000}
          />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="form-label">
            Nivel
            <input
              name="level"
              defaultValue={course?.level ?? "Inicial"}
              className="form-input"
              required
              minLength={2}
              maxLength={60}
            />
          </label>
          <label className="form-label">
            Duración estimada (horas)
            <input
              type="number"
              name="durationHours"
              defaultValue={course?.durationHours ?? 1}
              min={0.25}
              max={9999}
              step={0.25}
              required
              className="form-input"
            />
          </label>
        </div>
        {course && (
          <label className="form-label">
            Estado de publicación
            <select
              name="status"
              defaultValue={course.status}
              className="form-input"
            >
              <option value="borrador">Borrador</option>
              <option value="revision">En revisión</option>
              <option value="publicado">Publicado</option>
              <option value="archivado">Archivado</option>
            </select>
            <span className="text-xs font-normal text-muted">
              Solo las materias publicadas permiten estudiar. Archivar conserva
              sus datos y matrículas.
            </span>
          </label>
        )}
        <fieldset
          disabled={course?.enrolled}
          className="space-y-4 rounded-xl border border-line p-4"
        >
          <legend className="px-2 font-semibold">Requisitos de avance</legend>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="requireLessons"
              defaultChecked={course?.requireLessons ?? true}
              className="h-5 w-5 accent-brand"
            />
            Exigir completar las lecciones obligatorias
          </label>
          <label className="form-label">
            Evaluación para avanzar
            <select
              name="exam"
              defaultValue={course?.exam ?? "ninguno"}
              className="form-input"
            >
              <option value="ninguno">No exigir evaluación</option>
              <option value="presentar">Exigir presentar una evaluación</option>
              <option value="aprobar">Exigir aprobar una evaluación</option>
            </select>
          </label>
          <p className="text-xs text-muted">
            La gestión de exámenes se incorpora en otra entrega. Si exiges
            evaluación, el avance entre módulos quedará condicionado a un
            resultado registrado.
          </p>
        </fieldset>
        {course?.enrolled && (
          <p className="text-sm text-muted">
            Esta materia ya tiene matrículas. Sus requisitos y estructura se
            conservan; puedes corregir textos y disponibilidad.
          </p>
        )}
        <ReasonField />
        <SaveButton
          pending={action.pending}
          label={course ? "Guardar materia" : "Crear materia en borrador"}
        />
      </fieldset>
      <ActionFeedback feedback={action.feedback} />
    </form>
  );
}

export function ModuleEditor({
  courseId,
  module,
  enrolled,
  nextOrder = 1,
  canEdit = true,
}: {
  courseId: string;
  module?: ManagedModule;
  enrolled: boolean;
  nextOrder?: number;
  canEdit?: boolean;
}) {
  const action = useAcademicAction(
    `management/courses/${courseId}/modules${module ? `/${module.id}` : ""}`,
  );
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void action.submit({
      title: data.get("title"),
      description: data.get("description"),
      order: Number(data.get("order")),
      published: data.get("published") === "on",
      reason: data.get("reason"),
      ...(module ? { revision: module.revision } : {}),
    });
  }
  return (
    <form onSubmit={submit} aria-busy={action.pending} className="space-y-5">
      <fieldset
        disabled={!canEdit || action.pending || (!module && enrolled)}
        className="space-y-5 disabled:opacity-70"
      >
        <label className="form-label">
          Título del módulo
          <input
            name="title"
            defaultValue={module?.title}
            required
            minLength={3}
            maxLength={180}
            className="form-input"
          />
        </label>
        <label className="form-label">
          Descripción
          <textarea
            name="description"
            defaultValue={module?.description}
            required
            minLength={5}
            maxLength={4000}
            rows={2}
            className="form-input"
          />
        </label>
        <label className="form-label max-w-xs">
          Posición en el temario
          <input
            type="number"
            name="order"
            defaultValue={module?.order ?? nextOrder}
            readOnly={enrolled}
            required
            min={1}
            max={10000}
            className="form-input"
          />
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="published"
            defaultChecked={module?.published ?? false}
            className="h-5 w-5 accent-brand"
          />
          Módulo publicado
        </label>
        <ReasonField />
        <SaveButton
          pending={action.pending}
          label={module ? "Guardar módulo" : "Crear módulo"}
        />
      </fieldset>
      <ActionFeedback feedback={action.feedback} />
    </form>
  );
}

export function LessonEditor({
  courseId,
  moduleId,
  lesson,
  enrolled,
  nextOrder = 1,
  canEdit = true,
}: {
  courseId: string;
  moduleId: string;
  lesson?: ManagedLesson;
  enrolled: boolean;
  nextOrder?: number;
  canEdit?: boolean;
}) {
  const action = useAcademicAction(
    `management/courses/${courseId}/modules/${moduleId}/lessons${lesson ? `/${lesson.id}` : ""}`,
  );
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void action.submit({
      title: data.get("title"),
      type: enrolled && lesson ? lesson.type : data.get("type"),
      content: data.get("content"),
      order: Number(data.get("order")),
      durationMinutes: Number(data.get("durationMinutes")),
      published: data.get("published") === "on",
      required:
        enrolled && lesson ? lesson.required : data.get("required") === "on",
      reason: data.get("reason"),
      ...(lesson ? { revision: lesson.revision } : {}),
    });
  }
  if (lesson?.type === "video")
    return (
      <p className="rounded-xl bg-surface-soft p-5 text-muted">
        Esta lección utiliza video. Su contenido se conserva; la administración
        de recursos multimedia privados requiere el reproductor y almacenamiento
        correspondientes.
      </p>
    );
  return (
    <form onSubmit={submit} aria-busy={action.pending} className="space-y-5">
      <fieldset
        disabled={!canEdit || action.pending || (!lesson && enrolled)}
        className="space-y-5 disabled:opacity-70"
      >
        <label className="form-label">
          Título de la lección
          <input
            name="title"
            defaultValue={lesson?.title}
            required
            minLength={3}
            maxLength={180}
            className="form-input"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="form-label">
            Tipo
            <select
              name="type"
              defaultValue={lesson?.type ?? "lectura"}
              disabled={enrolled}
              className="form-input"
            >
              <option value="lectura">Lectura</option>
              <option value="actividad">Actividad personal</option>
              <option value="enlace">Enlace HTTPS</option>
            </select>
          </label>
          <label className="form-label">
            Posición
            <input
              type="number"
              name="order"
              defaultValue={lesson?.order ?? nextOrder}
              readOnly={enrolled}
              required
              min={1}
              max={10000}
              className="form-input"
            />
          </label>
          <label className="form-label">
            Minutos estimados
            <input
              name="durationMinutes"
              type="number"
              defaultValue={lesson?.durationMinutes ?? 10}
              required
              min={0}
              max={10000}
              className="form-input"
            />
          </label>
        </div>
        <label className="form-label">
          Contenido
          <textarea
            name="content"
            defaultValue={lesson?.content ?? ""}
            maxLength={20000}
            rows={14}
            className="form-input leading-7"
            placeholder="Escribe la lectura o actividad. Para un enlace, escribe únicamente la dirección HTTPS."
          />
          <span className="text-xs font-normal text-muted">
            Texto de hasta 20.000 caracteres. Los saltos de línea se conservan.
          </span>
        </label>
        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-3 text-sm">
            <input
              name="published"
              type="checkbox"
              defaultChecked={lesson?.published ?? false}
              className="h-5 w-5 accent-brand"
            />
            Publicar lección
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              name="required"
              type="checkbox"
              disabled={enrolled}
              defaultChecked={lesson?.required ?? true}
              className="h-5 w-5 accent-brand"
            />
            Obligatoria para avanzar
          </label>
        </div>
        <ReasonField />
        <SaveButton
          pending={action.pending}
          label={lesson ? "Guardar lección" : "Crear lección"}
        />
      </fieldset>
      <ActionFeedback feedback={action.feedback} />
    </form>
  );
}

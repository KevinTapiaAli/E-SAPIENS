"use client";
import { useState, type FormEvent } from "react";
import type { AcademicPerson } from "@esapiens/contracts";
import {
  ActionFeedback,
  useAcademicAction,
} from "@/features/classroom/academic-action";
import { ReasonField, SaveButton } from "./editor-forms";

export function CreateAccount({
  generalAdmin,
  teacherOnly = false,
}: {
  generalAdmin: boolean;
  teacherOnly?: boolean;
}) {
  const [role, setRole] = useState(teacherOnly ? "docente" : "estudiante");
  const action = useAcademicAction("management/users");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const result = await action.submit({
      firstName: data.get("firstName"),
      lastName: data.get("lastName"),
      email: data.get("email"),
      password: data.get("password"),
      role,
      specialty: role === "docente" ? data.get("specialty") : "",
      curriculumUrl: role === "docente" ? data.get("curriculumUrl") : "",
      qualificationReview:
        role === "docente" ? data.get("qualificationReview") : "",
      reason: data.get("reason"),
    });
    if (result?.ok) {
      form.reset();
      setRole(teacherOnly ? "docente" : "estudiante");
    }
  }
  return (
    <details className="ui-card mb-8 p-6">
      <summary className="cursor-pointer py-2 text-lg font-semibold text-brand">
        {teacherOnly ? "Dar de alta a un docente" : "Crear una cuenta"}
      </summary>
      <form
        onSubmit={submit}
        aria-busy={action.pending}
        className="mt-5 space-y-5"
      >
        <fieldset disabled={action.pending} className="space-y-5">
          <p className="text-sm text-muted">
            La cuenta quedará aprobada con el perfil seleccionado. Comunica su
            contraseña personalmente al titular por un canal privado.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="form-label">
              Nombres
              <input
                name="firstName"
                required
                maxLength={100}
                autoComplete="off"
                className="form-input"
              />
            </label>
            <label className="form-label">
              Apellidos
              <input
                name="lastName"
                required
                maxLength={100}
                autoComplete="off"
                className="form-input"
              />
            </label>
          </div>
          <label className="form-label">
            Correo electrónico
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="off"
              className="form-input"
            />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="form-label">
              Perfil
              <select
                value={role}
                disabled={teacherOnly}
                onChange={(e) => setRole(e.target.value)}
                className="form-input"
              >
                <option value="estudiante">Estudiante</option>
                <option value="docente">Docente</option>
                {generalAdmin && (
                  <option value="administrador">Administrador</option>
                )}
              </select>
            </label>
            <label className="form-label">
              Contraseña inicial
              <input
                name="password"
                type="password"
                required
                minLength={15}
                maxLength={128}
                autoComplete="new-password"
                className="form-input"
              />
              <span className="text-xs font-normal text-muted">
                Entre 15 y 128 caracteres.
              </span>
            </label>
          </div>
          {role === "docente" && (
            <>
              <label className="form-label">
                Especialidad
                <input
                  name="specialty"
                  required
                  maxLength={200}
                  minLength={3}
                  className="form-input"
                />
              </label>
              <label className="form-label">
                Enlace al currículum (opcional)
                <input
                  name="curriculumUrl"
                  type="url"
                  pattern="https://.*"
                  maxLength={2000}
                  className="form-input"
                />
              </label>
              <label className="form-label">
                Revisión de formación o especialidad
                <textarea
                  name="qualificationReview"
                  minLength={10}
                  maxLength={1000}
                  required
                  rows={3}
                  className="form-input"
                  placeholder="Describe la formación revisada y su relación con las materias que podrá impartir."
                />
              </label>
            </>
          )}
          <ReasonField />
          <SaveButton pending={action.pending} label="Crear cuenta aprobada" />
        </fieldset>
        <ActionFeedback feedback={action.feedback} />
      </form>
    </details>
  );
}

export function TeacherProfileReview({ person }: { person: AcademicPerson }) {
  const action = useAcademicAction(`management/teachers/${person.id}/review`);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await action.submit({
      specialty: f.get("specialty"),
      curriculumUrl: f.get("curriculumUrl"),
      qualificationReview: f.get("qualificationReview"),
      revision: person.profileRevision,
    });
  }
  return (
    <details className="mt-4 rounded-xl border border-line p-4">
      <summary className="cursor-pointer py-2 font-semibold text-brand">
        Revisar o actualizar formación
      </summary>
      <form
        onSubmit={submit}
        className="mt-4 space-y-4"
        aria-busy={action.pending}
      >
        <fieldset disabled={action.pending} className="space-y-4">
          <label className="form-label">
            Especialidad
            <input
              name="specialty"
              required
              minLength={3}
              maxLength={200}
              defaultValue={person.specialty ?? ""}
              className="form-input"
            />
          </label>
          <label className="form-label">
            Enlace al currículum (opcional)
            <input
              name="curriculumUrl"
              type="url"
              pattern="https://.*"
              maxLength={2000}
              defaultValue={person.curriculumUrl ?? ""}
              className="form-input"
            />
          </label>
          <label className="form-label">
            Revisión de formación o especialidad
            <textarea
              name="qualificationReview"
              required
              minLength={10}
              maxLength={1000}
              rows={3}
              defaultValue={person.qualificationReview ?? ""}
              className="form-input"
            />
          </label>
          <SaveButton pending={action.pending} label="Registrar revisión" />
        </fieldset>
        <ActionFeedback feedback={action.feedback} />
      </form>
    </details>
  );
}

export function UserStateControl({
  person,
  actorId,
  generalAdmin,
}: {
  person: AcademicPerson;
  actorId: string;
  generalAdmin: boolean;
}) {
  const action = useAcademicAction(`management/users/${person.id}/state`);
  if (person.id === actorId)
    return <span className="text-xs text-muted">Tu cuenta</span>;
  if (
    !person.roles.length ||
    person.roles.includes("administrador_general") ||
    (person.roles.includes("administrador") && !generalAdmin)
  )
    return <span className="text-xs text-muted">Perfil protegido</span>;
  const next = person.status === "aprobado" ? "suspendido" : "aprobado";
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void action.submit({
      status: next,
      expectedStatus: person.status,
      reason: data.get("reason"),
    });
  }
  return (
    <details className="min-w-44">
      <summary className="cursor-pointer py-3 text-sm font-medium text-brand">
        {next === "suspendido" ? "Suspender cuenta" : "Aprobar cuenta"}
      </summary>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <label className="form-label">
          Motivo
          <textarea
            name="reason"
            required
            minLength={5}
            maxLength={500}
            rows={2}
            className="form-input"
          />
        </label>
        <SaveButton pending={action.pending} label="Confirmar" />
        <ActionFeedback feedback={action.feedback} />
      </form>
    </details>
  );
}

export function EnrollmentStateControl({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const action = useAcademicAction(`management/enrollments/${id}/state`);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void action.submit({
      status: data.get("status"),
      expectedStatus: status,
      reason: data.get("reason"),
    });
  }
  return (
    <details className="ui-card mb-6 p-6">
      <summary className="cursor-pointer py-2 font-semibold">
        Cambiar estado de matrícula
      </summary>
      <form onSubmit={submit} className="mt-5 space-y-5">
        <label className="form-label">
          Estado
          <select name="status" defaultValue={status} className="form-input">
            <option value="activa">Activa</option>
            <option value="suspendida">Suspendida</option>
            <option value="abandonada">Abandonada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </label>
        <p className="text-sm text-muted">
          Suspender bloquea el estudio. Reactivar conserva el progreso y
          requiere cobertura vigente; no renueva las autorizaciones vencidas.
        </p>
        <ReasonField />
        <SaveButton pending={action.pending} />
        <ActionFeedback feedback={action.feedback} />
      </form>
    </details>
  );
}

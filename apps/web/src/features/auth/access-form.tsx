"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { actionFeedback } from "./action-feedback";

export function AccessForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<{
    error: boolean;
    message: string;
    unavailable?: boolean;
  } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (register && password !== form.get("confirmPassword")) {
      setFeedback({ error: true, message: "Las contraseñas no coinciden." });
      return;
    }
    submitting.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/identity/${register ? "register" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            email: form.get("email"),
            password,
            ...(register
              ? {
                  firstName: form.get("firstName"),
                  lastName: form.get("lastName"),
                }
              : {}),
          }),
        },
      );
      const data = actionFeedback((await response.json()) as unknown);
      if (!response.ok) {
        setFeedback({
          error: true,
          unavailable: response.status >= 500,
          message:
            data.code === "VALIDATION_ERROR"
              ? "Revisa los campos y la longitud de la contraseña."
              : response.status >= 500
                ? "No podemos iniciar sesión en este momento. El servicio necesita atención; inténtalo más tarde o avisa a administración."
                : data.message,
        });
      } else if (register) {
        setFeedback({ error: false, message: data.message });
      } else {
        router.replace("/portal");
        router.refresh();
      }
    } catch {
      setFeedback({
        error: true,
        unavailable: true,
        message:
          "No pudimos conectar. Revisa tu conexión e intenta nuevamente.",
      });
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-5" aria-busy={pending}>
      {register && (
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="form-label">
            Nombres
            <input
              name="firstName"
              autoComplete="given-name"
              required
              maxLength={100}
              className="form-input"
            />
          </label>
          <label className="form-label">
            Apellidos
            <input
              name="lastName"
              autoComplete="family-name"
              required
              maxLength={100}
              className="form-input"
            />
          </label>
        </div>
      )}
      <label className="form-label">
        Correo electrónico
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder="tu.correo@ejemplo.com"
          className="form-input"
        />
      </label>
      <label className="form-label">
        Contraseña
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete={register ? "new-password" : "current-password"}
          minLength={register ? 15 : 1}
          maxLength={128}
          required
          className="form-input"
          aria-describedby={register ? "password-help" : undefined}
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {register && (
          <p id="password-help" className="text-sm text-muted">
            Usa una frase de 15 a 128 caracteres.
          </p>
        )}
        <button
          type="button"
          aria-pressed={showPassword}
          className="text-link min-h-11 text-sm"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
        </button>
      </div>
      {register && (
        <label className="form-label">
          Repite la contraseña
          <input
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={15}
            maxLength={128}
            required
            className="form-input"
          />
        </label>
      )}
      <div aria-live="polite" aria-atomic="true">
        {feedback && (
          <div
            role={feedback.error ? "alert" : "status"}
            className={`rounded-xl border p-4 text-sm ${feedback.error ? "border-danger bg-danger-soft text-danger" : "border-success bg-success-soft text-success"}`}
          >
            <p className="font-medium">
              {feedback.unavailable
                ? "Servicio de acceso no disponible"
                : feedback.error
                  ? "Revisa tu solicitud"
                  : "Solicitud recibida"}
            </p>
            <p className="mt-2">{feedback.message}</p>
            {feedback.unavailable && (
              <p className="mt-2">
                No necesitas cambiar tu contraseña por este mensaje.
              </p>
            )}
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={pending || (register && feedback?.error === false)}
        className="button button-primary w-full disabled:cursor-wait disabled:opacity-60"
      >
        {pending
          ? "Procesando…"
          : register
            ? "Solicitar mi cuenta"
            : "Iniciar sesión"}
      </button>
      <p className="text-center text-sm text-muted">
        {register
          ? "¿Ya tienes una cuenta aprobada?"
          : "¿Eres nuevo en E-SAPIENS?"}{" "}
        <Link className="text-link" href={register ? "/login" : "/registro"}>
          {register ? "Inicia sesión" : "Solicita tu cuenta"}
        </Link>
      </p>
    </form>
  );
}

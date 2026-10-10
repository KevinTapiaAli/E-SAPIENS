/** Validate the small JSON envelope before rendering server-provided text. */
export function actionFeedback(value: unknown): {
  code?: string;
  message: string;
} {
  if (!value || typeof value !== "object")
    return { message: "No se pudo completar la solicitud." };
  const body = value as Record<string, unknown>;
  if (body.error && typeof body.error === "object") {
    const error = body.error as Record<string, unknown>;
    return {
      code: typeof error.code === "string" ? error.code : undefined,
      message:
        typeof error.message === "string"
          ? error.message
          : "No se pudo completar la solicitud.",
    };
  }
  return {
    message:
      typeof body.message === "string" ? body.message : "Solicitud completada.",
  };
}

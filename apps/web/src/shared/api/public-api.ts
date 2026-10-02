/** Consumidor de Server Components. Nunca reenviar credenciales del navegador. */
export type PublicApiResult<T> =
  | { status: "ok"; data: T }
  | { status: "not-found" | "invalid-query" | "unavailable" };

export async function readPublicApi<T>(
  path: string,
  validate: (value: unknown) => value is T,
): Promise<PublicApiResult<T>> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) return { status: "unavailable" };
  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/api/v1${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    });
    if (response.status === 404) return { status: "not-found" };
    if (response.status === 400) return { status: "invalid-query" };
    if (!response.ok) return { status: "unavailable" };
    const data: unknown = await response.json();
    return validate(data) ? { status: "ok", data } : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function isPublicPage<T>(
  value: unknown,
  validateItem: (item: unknown) => item is T,
): value is { items: T[]; nextCursor: string | null } {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(validateItem) &&
    (value.nextCursor === null || typeof value.nextCursor === "string")
  );
}

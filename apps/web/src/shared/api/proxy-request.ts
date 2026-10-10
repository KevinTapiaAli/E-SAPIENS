import "server-only";
import { NextResponse } from "next/server";

export const privateHeaders = { "Cache-Control": "private, no-store" };

/** Shared request boundary for the two authenticated web proxies. */
export async function readProxyBody(
  request: Request,
  origin: string,
  maxBytes: number,
): Promise<
  { body: string; error?: never } | { body?: never; error: NextResponse }
> {
  const reject = (status: number, message: string) => ({
    error: NextResponse.json(
      { error: { message } },
      { status, headers: privateHeaders },
    ),
  });
  const site = request.headers.get("sec-fetch-site");
  if (
    request.headers.get("origin") !== origin ||
    (site !== null && site !== "same-origin")
  )
    return reject(403, "Origen de la solicitud no permitido.");
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json")
    return reject(415, "Formato de solicitud no permitido.");
  if (Number(request.headers.get("content-length")) > maxBytes)
    return reject(413, "Solicitud demasiado grande.");

  const reader = request.body?.getReader();
  if (!reader) return { body: "{}" };
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        return reject(413, "Solicitud demasiado grande.");
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = Buffer.concat(chunks, length).toString("utf8");
  try {
    const value: unknown = JSON.parse(body);
    if (!value || typeof value !== "object" || Array.isArray(value))
      return reject(400, "La solicitud debe contener un objeto JSON.");
  } catch {
    return reject(400, "La solicitud contiene un JSON inválido.");
  }
  return { body };
}

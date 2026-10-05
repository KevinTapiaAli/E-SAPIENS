import { NextRequest, NextResponse } from "next/server";
import { identityConfig, sessionCookie } from "@/features/auth/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const path = (await context.params).path.join("/");
  if (
    !["login", "logout", "register", "avatar"].includes(path) &&
    !/^accounts\/[0-9a-f-]{36}\/review$/.test(path)
  ) {
    return NextResponse.json(
      { error: { message: "Ruta no disponible." } },
      { status: 404 },
    );
  }
  const noStore = { "Cache-Control": "no-store" };
  try {
    const { api, origin } = identityConfig();
    if (
      request.headers.get("origin") !== origin ||
      (request.headers.has("sec-fetch-site") &&
        request.headers.get("sec-fetch-site") !== "same-origin")
    ) {
      return NextResponse.json(
        { error: { message: "Origen de la solicitud no permitido." } },
        { status: 403, headers: noStore },
      );
    }
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return NextResponse.json(
        { error: { message: "Formato de solicitud no permitido." } },
        { status: 415, headers: noStore },
      );
    }
    // Stream with an actual byte limit; Content-Length alone is untrusted.
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    if (reader) {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        length += next.value.byteLength;
        if (length > (path === "avatar" ? 65536 : 8192)) {
          await reader.cancel();
          return NextResponse.json(
            { error: { message: "Solicitud demasiado grande." } },
            { status: 413, headers: noStore },
          );
        }
        chunks.push(next.value);
      }
    }
    const body = Buffer.concat(chunks).toString("utf8");
    const upstream = await fetch(`${api}/api/v1/identity/${path}`, {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        Cookie: await sessionCookie(),
      },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const response = new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: { ...noStore, "Content-Type": "application/json" },
    });
    for (const cookie of upstream.headers.getSetCookie())
      response.headers.append("Set-Cookie", cookie);
    return response;
  } catch {
    return NextResponse.json(
      {
        error: {
          message:
            "No pudimos conectar con E-SAPIENS. Intenta nuevamente en unos momentos.",
        },
      },
      { status: 503, headers: noStore },
    );
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if ((await context.params).path.join("/") !== "avatar")
    return new NextResponse(null, { status: 404 });
  try {
    const { api } = identityConfig();
    const upstream = await fetch(`${api}/api/v1/identity/avatar`, {
      headers: { Cookie: await sessionCookie() },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok)
      return new NextResponse(null, { status: upstream.status });
    return new NextResponse(await upstream.arrayBuffer(), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}

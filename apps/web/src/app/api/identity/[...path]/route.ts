import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { identityConfig, sessionCookie } from "@/features/auth/server";
import { privateHeaders, readProxyBody } from "@/shared/api/proxy-request";
import { visitorToken } from "@/shared/api/visitor-cookie";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const path = (await context.params).path.join("/");
  if (
    !["login", "logout", "register", "avatar"].includes(path) &&
    !/^accounts\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/review$/i.test(
      path,
    )
  ) {
    return NextResponse.json(
      { error: { message: "Ruta no disponible." } },
      { status: 404, headers: privateHeaders },
    );
  }
  const noStore = privateHeaders;
  const requestId = randomUUID();
  let configured = false;
  try {
    const { api, origin } = identityConfig();
    configured = true;
    const result = await readProxyBody(
      request,
      origin,
      path === "avatar" ? 65536 : 8192,
    );
    if (result.error) return result.error;
    const upstream = await fetch(`${api}/api/v1/identity/${path}`, {
      method: "POST",
      body: result.body,
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
        Origin: origin,
        Cookie: await sessionCookie(),
        "X-Esapiens-Visitor": visitorToken(request),
      },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const response = new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: {
        ...noStore,
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
      },
    });
    for (const cookie of upstream.headers.getSetCookie())
      response.headers.append("Set-Cookie", cookie);
    return response;
  } catch (error) {
    const code = !configured
      ? "IDENTITY_CONFIGURATION_ERROR"
      : error instanceof Error && error.name === "TimeoutError"
        ? "IDENTITY_GATEWAY_TIMEOUT"
        : "IDENTITY_GATEWAY_UNAVAILABLE";
    // Correlación operativa sin registrar contraseñas, cookies ni URLs privadas.
    console.error(
      JSON.stringify({ service: "identity-proxy", code, requestId }),
    );
    return NextResponse.json(
      {
        error: {
          code,
          message:
            "No pudimos conectar con E-SAPIENS. Intenta nuevamente en unos momentos.",
        },
      },
      { status: 503, headers: { ...noStore, "X-Request-Id": requestId } },
    );
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if ((await context.params).path.join("/") !== "avatar")
    return new NextResponse(null, { status: 404, headers: privateHeaders });
  try {
    const { api } = identityConfig();
    const upstream = await fetch(`${api}/api/v1/identity/avatar`, {
      headers: { Cookie: await sessionCookie() },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok)
      return new NextResponse(null, {
        status: upstream.status,
        headers: privateHeaders,
      });
    return new NextResponse(await upstream.arrayBuffer(), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new NextResponse(null, { status: 503, headers: privateHeaders });
  }
}

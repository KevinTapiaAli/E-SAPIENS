import { NextRequest, NextResponse } from "next/server";
import { identityConfig, sessionCookie } from "@/features/auth/server";

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const path = (await context.params).path.join("/");
  const uuid =
    "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
  const routes =
    request.method === "GET"
      ? [
          "courses",
          "agenda",
          "people",
          "enrollments",
          "offerings",
          "registration-requests",
        ]
      : [
          "enrollments",
          "assignments",
          "registration-requests",
          "management/users",
          "management/courses",
          "agenda",
        ];
  const dynamicRoutes =
    request.method === "GET"
      ? [
          new RegExp(`^enrollments/${uuid}$`),
          new RegExp(`^management/courses/${uuid}$`),
          new RegExp(`^management/courses/${uuid}/lessons/${uuid}$`),
          new RegExp(
            `^teaching/${uuid}(?:/materials|/tasks(?:/${uuid}(?:/submissions)?)?)?$`,
          ),
        ]
      : [
          new RegExp(`^registration-requests/${uuid}/review$`),
          new RegExp(`^agenda/${uuid}$`),
          new RegExp(`^enrollments/${uuid}/access$`),
          new RegExp(`^enrollments/${uuid}/access/${uuid}/revoke$`),
          new RegExp(`^classroom/${uuid}/lessons/${uuid}/complete$`),
          new RegExp(`^management/users/${uuid}/state$`),
          new RegExp(`^management/teachers/${uuid}/review$`),
          new RegExp(`^teaching/${uuid}/(?:materials|tasks)(?:/${uuid})?$`),
          new RegExp(
            `^teaching/${uuid}/tasks/${uuid}/submissions(?:/${uuid}/(?:feedback|grade))?$`,
          ),
          new RegExp(`^management/enrollments/${uuid}/state$`),
          new RegExp(`^management/courses/${uuid}$`),
          new RegExp(`^management/courses/${uuid}/modules(?:/${uuid})?$`),
          new RegExp(
            `^management/courses/${uuid}/modules/${uuid}/lessons(?:/${uuid})?$`,
          ),
        ];
  const headers = {
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
  };
  if (
    !routes.includes(path) &&
    !dynamicRoutes.some((route) => route.test(path))
  )
    return NextResponse.json(
      { error: { message: "Ruta no disponible." } },
      { status: 404, headers },
    );
  try {
    const { api, origin } = identityConfig();
    let body: string | undefined;
    if (request.method === "POST") {
      if (
        request.headers.get("origin") !== origin ||
        (request.headers.has("sec-fetch-site") &&
          request.headers.get("sec-fetch-site") !== "same-origin")
      )
        return NextResponse.json(
          { error: { message: "Origen no permitido." } },
          { status: 403, headers },
        );
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return NextResponse.json(
          { error: { message: "Formato no permitido." } },
          { status: 415, headers },
        );
      const reader = request.body?.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      if (reader)
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          length += part.value.byteLength;
          if (
            length >
            (path.startsWith("management/courses") ||
            path.startsWith("teaching/")
              ? 98304
              : 8192)
          ) {
            await reader.cancel();
            return NextResponse.json(
              { error: { message: "Solicitud demasiado grande." } },
              { status: 413, headers },
            );
          }
          chunks.push(part.value);
        }
      body = Buffer.concat(chunks).toString("utf8");
    }
    const response = await fetch(
      `${api}/api/v1/academic/${path}${request.method === "GET" ? request.nextUrl.search : ""}`,
      {
        method: request.method,
        body,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(10000),
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          Cookie: await sessionCookie(),
        },
      },
    );
    return new NextResponse(await response.text(), {
      status: response.status,
      headers,
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          message: "No pudimos conectar con E-SAPIENS. Intenta nuevamente.",
        },
      },
      { status: 503, headers },
    );
  }
}
export const GET = proxy;
export const POST = proxy;

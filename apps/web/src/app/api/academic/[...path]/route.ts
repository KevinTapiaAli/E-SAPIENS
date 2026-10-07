import { NextRequest, NextResponse } from "next/server";
import { identityConfig, sessionCookie } from "@/features/auth/server";
import { privateHeaders, readProxyBody } from "@/shared/api/proxy-request";

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
    ...privateHeaders,
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
      const result = await readProxyBody(
        request,
        origin,
        path.startsWith("management/courses") || path.startsWith("teaching/")
          ? 98304
          : 8192,
      );
      if (result.error) return result.error;
      body = result.body;
    }
    const response = await fetch(
      `${api}/api/v1/academic/${path}${request.method === "GET" || /^agenda(?:\/|$)/.test(path) ? request.nextUrl.search : ""}`,
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

import { NextRequest, NextResponse } from "next/server";
import { identityConfig, sessionCookie } from "@/features/auth/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ kind: string }> },
) {
  const { kind } = await context.params;
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (!["docentes.xlsx", "estudiantes.xlsx"].includes(kind))
    return NextResponse.json(
      { error: { message: "Exportación no disponible." } },
      { status: 404, headers },
    );
  try {
    const { api, origin } = identityConfig();
    const response = await fetch(
      `${api}/api/v1/academic/exports/${kind}${request.nextUrl.search}`,
      {
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(30000),
        headers: { Cookie: await sessionCookie(), Origin: origin },
      },
    );
    return new NextResponse(await response.arrayBuffer(), {
      status: response.status,
      headers: {
        ...headers,
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/json",
        ...(response.headers.get("Content-Disposition")
          ? {
              "Content-Disposition": response.headers.get(
                "Content-Disposition",
              )!,
            }
          : {}),
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          message:
            "No se pudo generar el Excel. Comprueba la disponibilidad del servicio.",
        },
      },
      { status: 503, headers },
    );
  }
}

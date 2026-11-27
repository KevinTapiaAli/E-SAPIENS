import { NextRequest, NextResponse } from "next/server";
import { identityConfig, sessionCookie } from "@/features/auth/server";
import { privateHeaders } from "@/shared/api/proxy-request";

export async function GET(request: NextRequest) {
  try {
    const { api } = identityConfig();
    const response = await fetch(
      `${api}/api/v1/analytics/data-center/export.csv?${request.nextUrl.searchParams}`,
      {
        headers: { Cookie: await sessionCookie(), Accept: "text/csv" },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok)
      return NextResponse.json(
        {
          error: {
            message: "La exportación no está disponible para esta consulta.",
          },
        },
        { status: response.status, headers: privateHeaders },
      );
    const headers = new Headers({
      ...privateHeaders,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    });
    for (const name of [
      "content-disposition",
      "x-export-rows",
      "x-export-total",
      "x-export-truncated",
    ]) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new NextResponse(response.body, { status: 200, headers });
  } catch {
    return NextResponse.json(
      { error: { message: "Servicio de analítica no disponible." } },
      { status: 503, headers: privateHeaders },
    );
  }
}

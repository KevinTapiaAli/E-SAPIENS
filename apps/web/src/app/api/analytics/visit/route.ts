import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { identityConfig, sessionCookie } from "@/features/auth/server";
import { privateHeaders, readProxyBody } from "@/shared/api/proxy-request";
import {
  measurementAllowed,
  visitorCookieName,
  visitorToken,
} from "@/shared/api/visitor-cookie";

export async function POST(request: NextRequest) {
  try {
    const { api, origin } = identityConfig();
    const result = await readProxyBody(request, origin, 1024);
    if (result.error) return result.error;
    const response = new NextResponse(null, {
      status: 204,
      headers: privateHeaders,
    });
    if (!measurementAllowed(request)) {
      response.cookies.set(visitorCookieName(), "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
        secure: origin.startsWith("https:"),
        sameSite: "lax",
      });
      return response;
    }
    const existing = visitorToken(request);
    const token = existing || randomBytes(32).toString("hex");
    const upstream = await fetch(`${api}/api/v1/analytics/visit`, {
      method: "POST",
      body: result.body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(4000),
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        Cookie: await sessionCookie(),
        "X-Esapiens-Visitor": token,
      },
    });
    if (!upstream.ok)
      return new NextResponse(null, {
        status: upstream.status,
        headers: privateHeaders,
      });
    if (!existing)
      response.cookies.set(visitorCookieName(), token, {
        httpOnly: true,
        secure: origin.startsWith("https:"),
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 86400,
      });
    return response;
  } catch {
    return new NextResponse(null, { status: 503, headers: privateHeaders });
  }
}

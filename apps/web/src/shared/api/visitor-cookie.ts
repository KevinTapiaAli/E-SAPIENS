import "server-only";
import type { NextRequest } from "next/server";
import { identityConfig } from "@/features/auth/server";

export function visitorCookieName() {
  return identityConfig().origin.startsWith("https:")
    ? "__Host-esapiens_visitor"
    : "esapiens_visitor";
}

export function measurementAllowed(request: NextRequest) {
  return (
    request.cookies.get("esapiens_measurement")?.value !== "off" &&
    request.headers.get("dnt") !== "1" &&
    request.headers.get("sec-gpc") !== "1"
  );
}

export function visitorToken(request: NextRequest): string {
  if (!measurementAllowed(request)) return "";
  const token = request.cookies.get(visitorCookieName())?.value;
  return token && /^[a-f0-9]{64}$/.test(token) ? token : "";
}

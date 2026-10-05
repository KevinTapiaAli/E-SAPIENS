import "server-only";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import type {
  PendingAccount,
  PublicPage,
  SessionUser,
  WorkspaceRole,
} from "@esapiens/contracts";
import { isRecord } from "@/shared/api/public-api";

export function identityConfig() {
  const api = process.env.API_URL;
  const app = process.env.APP_URL;
  if (!api || !app)
    throw new Error("API_URL y APP_URL son necesarias para el acceso.");
  const origin = new URL(app).origin;
  return {
    api: api.replace(/\/$/, ""),
    origin,
    cookieName: origin.startsWith("https:")
      ? "__Host-esapiens_session"
      : "esapiens_session",
  };
}

export async function sessionCookie(): Promise<string> {
  const { cookieName } = identityConfig();
  const value = (await cookies()).get(cookieName)?.value;
  return value && /^[a-f0-9]{64}$/.test(value) ? `${cookieName}=${value}` : "";
}

export async function readIdentity<T>(
  path: string,
  validate: (value: unknown) => value is T,
): Promise<{ status: number; data?: T }> {
  return readPrivateApi(`identity/${path}`, validate);
}

/** Solo Server Components; rutas construidas por la aplicación. */
export async function readPrivateApi<T>(
  path: string,
  validate: (value: unknown) => value is T,
): Promise<{ status: number; data?: T }> {
  try {
    const { api } = identityConfig();
    const response = await fetch(`${api}/api/v1/${path}`, {
      headers: { cookie: await sessionCookie(), Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
    if (!response.ok) return { status: response.status };
    const data: unknown = await response.json();
    return validate(data) ? { status: response.status, data } : { status: 503 };
  } catch (error) {
    unstable_rethrow(error);
    return { status: 503 };
  }
}

export function isSessionUser(value: unknown): value is SessionUser {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.email === "string" &&
    typeof value.firstName === "string" &&
    typeof value.lastName === "string" &&
    typeof value.timeZone === "string" &&
    Array.isArray(value.roles) &&
    value.roles.every((r) => typeof r === "string") &&
    Array.isArray(value.permissions) &&
    value.permissions.every((p) => typeof p === "string")
  );
}

export function allowedWorkspaces(user: SessionUser): WorkspaceRole[] {
  const result: WorkspaceRole[] = [];
  if (
    user.roles.some((r) =>
      ["administrador", "administrador_general"].includes(r),
    ) &&
    user.permissions.includes("dashboard.admin")
  )
    result.push("administrador");
  if (
    user.roles.includes("docente") &&
    user.permissions.includes("dashboard.teacher")
  )
    result.push("docente");
  if (
    user.roles.includes("estudiante") &&
    user.permissions.includes("dashboard.student")
  )
    result.push("estudiante");
  return result;
}

export function isPendingPage(
  value: unknown,
): value is PublicPage<PendingAccount> {
  return (
    isRecord(value) &&
    (value.nextCursor === null || typeof value.nextCursor === "string") &&
    Array.isArray(value.items) &&
    value.items.every(
      (account: unknown) =>
        isRecord(account) &&
        typeof account.id === "string" &&
        typeof account.email === "string" &&
        typeof account.firstName === "string" &&
        typeof account.lastName === "string" &&
        typeof account.requestedAt === "string" &&
        Number.isFinite(Date.parse(account.requestedAt)),
    )
  );
}

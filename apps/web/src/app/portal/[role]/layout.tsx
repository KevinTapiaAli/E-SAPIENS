import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { portalSession } from "@/features/portal/server";
import { allowedWorkspaces } from "@/features/auth/server";
import { isWorkspaceRole } from "@/features/portal/navigation";
import { PortalShell } from "@/features/portal/portal-shell";
import { StatePanel } from "@/shared/ui/state-panel";
import { ActionLink } from "@/shared/ui/action-link";

export const metadata: Metadata = {
  title: "Portal",
  robots: { index: false, follow: false },
};
export default async function PortalRoleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (!isWorkspaceRole(role)) notFound();
  const user = await portalSession();
  const roles = allowedWorkspaces(user);
  if (!roles.includes(role))
    return (
      <main id="main-content" tabIndex={-1} className="page-shell py-12">
        <StatePanel
          as="h1"
          title="Este espacio no corresponde a tu perfil"
          description="Ingresa a tu portal para consultar las opciones de tu cuenta."
          action={<ActionLink href="/portal">Ir a mi portal</ActionLink>}
        />
      </main>
    );
  return (
    <PortalShell user={user} role={role} roles={roles}>
      {children}
    </PortalShell>
  );
}

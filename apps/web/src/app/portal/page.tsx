import { redirect } from "next/navigation";
import { portalSession } from "@/features/portal/server";
import { allowedWorkspaces } from "@/features/auth/server";
import { LogoutButton } from "@/features/auth/logout-button";
import { StatePanel } from "@/shared/ui/state-panel";

export default async function PortalPage() {
  const user = await portalSession();
  const roles = allowedWorkspaces(user);
  if (roles[0]) redirect(`/portal/${roles[0]}`);
  return (
    <main id="main-content" tabIndex={-1} className="page-shell py-12">
      <StatePanel
        as="h1"
        title="Tu cuenta necesita un perfil asignado"
        description="Contacta con la administración para habilitar tu espacio."
        action={<LogoutButton />}
      />
    </main>
  );
}

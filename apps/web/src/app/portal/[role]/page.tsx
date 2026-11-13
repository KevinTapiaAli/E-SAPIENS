import { notFound } from "next/navigation";
import { portalSession } from "@/features/portal/server";
import { isWorkspaceRole } from "@/features/portal/navigation";
import { PortalHeading } from "@/features/portal/portal-ui";
import { SpaceChoices } from "@/features/portal/space-home";

export default async function PortalHome({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (!isWorkspaceRole(role)) notFound();
  const user = await portalSession();
  return (
    <div className="mx-auto max-w-5xl py-6 sm:py-12">
      <PortalHeading
        eyebrow="Tu espacio E-Sapiens"
        title={`Hola, ${user.firstName}`}
        description="¿Qué necesitas hacer hoy? Elige un espacio. Puedes cambiar de uno a otro sin cerrar sesión."
      />
      <SpaceChoices role={role} />
    </div>
  );
}

import { notFound } from "next/navigation";
import { portalSession } from "@/features/portal/server";
import { isWorkspaceRole } from "@/features/portal/navigation";
import { PortalHeading } from "@/features/portal/portal-ui";
import { PortalAgenda } from "@/features/portal/portal-agenda";
import { dateInZone } from "@/features/portal/agenda-data";

export default async function AgendaPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (!isWorkspaceRole(role)) notFound();
  const user = await portalSession();
  if (
    !user.permissions.includes(
      role === "administrador"
        ? "academic.read"
        : role === "docente"
          ? "teaching.manage"
          : "classroom.study",
    )
  )
    notFound();
  return (
    <>
      <PortalHeading
        eyebrow="Tu organización académica"
        title="Mi agenda"
        description="Clases, plazos, evaluaciones y recordatorios en un solo lugar. Selecciona un período para consultar o descargar tus eventos."
      />
      <PortalAgenda
        role={role}
        timeZone={user.timeZone}
        today={dateInZone(new Date(), user.timeZone)}
      />
    </>
  );
}

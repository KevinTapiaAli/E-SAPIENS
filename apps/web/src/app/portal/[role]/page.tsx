import { notFound } from "next/navigation";
import { portalSession } from "@/features/portal/server";
import { isWorkspaceRole } from "@/features/portal/navigation";
import { PortalHeading } from "@/features/portal/portal-ui";
import { AdminAgenda } from "@/features/portal/admin-agenda";
import {
  LearningChallenge,
  TeachingCompass,
} from "@/features/portal/learning-home";
export default async function PortalHome({
  params,
  searchParams,
}: {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ month?: string; day?: string }>;
}) {
  const { role } = await params;
  if (!isWorkspaceRole(role)) notFound();
  const user = await portalSession();
  const filters = await searchParams;
  return (
    <>
      <PortalHeading
        eyebrow="Un nuevo paso en E-SAPIENS"
        title={`Hola, ${user.firstName}`}
        description={
          role === "administrador"
            ? "Organiza las fechas de la comunidad y reserva espacio para lo importante."
            : role === "docente"
              ? "Hoy puedes convertir una buena explicación en una experiencia de aprendizaje."
              : "Aprender también es descubrir qué estrategias funcionan para ti."
        }
      />
      {role === "administrador" ? (
        <AdminAgenda
          timeZone={user.timeZone}
          month={filters.month}
          day={filters.day}
        />
      ) : role === "docente" ? (
        <TeachingCompass />
      ) : (
        <LearningChallenge />
      )}
    </>
  );
}

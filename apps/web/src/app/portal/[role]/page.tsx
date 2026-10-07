import { notFound } from "next/navigation";
import { portalSession } from "@/features/portal/server";
import { isWorkspaceRole } from "@/features/portal/navigation";
import { PortalHeading } from "@/features/portal/portal-ui";
import { ExecutiveDashboardView } from "@/features/analytics/executive-dashboard";
import { InstitutionalCarousel } from "@/shared/ui/institutional-carousel";
import {
  LearningChallenge,
  TeachingCompass,
} from "@/features/portal/learning-home";
export default async function PortalHome({
  params,
  searchParams,
}: {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const { role } = await params;
  if (!isWorkspaceRole(role)) notFound();
  const user = await portalSession();
  const filters = await searchParams;
  if (role === "administrador")
    return (
      <>
        <ExecutiveDashboardView user={user} days={filters.days} />
        <div className="mt-8">
          <InstitutionalCarousel />
        </div>
      </>
    );
  return (
    <>
      <PortalHeading
        eyebrow="Un nuevo paso en E-SAPIENS"
        title={`Hola, ${user.firstName}`}
        description={
          role === "docente"
            ? "Hoy puedes convertir una buena explicación en una experiencia de aprendizaje."
            : "Aprender también es descubrir qué estrategias funcionan para ti."
        }
      />
      <div className="mb-6">
        <InstitutionalCarousel />
      </div>
      {role === "docente" ? <TeachingCompass /> : <LearningChallenge />}
    </>
  );
}

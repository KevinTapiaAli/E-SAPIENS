import { notFound } from "next/navigation";
import { portalSession } from "@/features/portal/server";
import { allowedWorkspaces } from "@/features/auth/server";
import { DataCenter } from "@/features/analytics/data-center";

export default async function DataCenterPage({
  params,
  searchParams,
}: {
  params: Promise<{ role: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { role } = await params;
  const user = await portalSession();
  if (
    role !== "administrador" ||
    !allowedWorkspaces(user).includes("administrador") ||
    !user.permissions.includes("academic.read")
  )
    notFound();
  return <DataCenter filters={await searchParams} user={user} />;
}

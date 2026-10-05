import { notFound, redirect } from "next/navigation";
import { isWorkspaceRole } from "@/features/portal/navigation";
export default async function LegacyWorkspacePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (!isWorkspaceRole(role)) notFound();
  redirect(`/portal/${role}`);
}

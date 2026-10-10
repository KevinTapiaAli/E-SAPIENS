import { notFound } from "next/navigation";
import { isWorkspaceRole } from "@/features/portal/navigation";
import { portalSession } from "@/features/portal/server";
import { isResourceId } from "@/features/classroom/server";
import { TeachingWorkspace } from "@/features/teaching/workspace";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ role: string; courseId: string; workspace: string }>;
  searchParams: Promise<{ cursor?: string; q?: string }>;
}) {
  const { role, courseId, workspace } = await params;
  const { cursor, q } = await searchParams;
  if (
    !isWorkspaceRole(role) ||
    !isResourceId(courseId) ||
    !["materiales", "tareas"].includes(workspace)
  )
    notFound();
  return (
    <TeachingWorkspace
      role={role}
      courseId={courseId}
      section={workspace as "materiales" | "tareas"}
      user={await portalSession()}
      q={typeof q === "string" ? q.slice(0, 100) : ""}
      cursor={isResourceId(cursor ?? "") ? cursor : undefined}
    />
  );
}

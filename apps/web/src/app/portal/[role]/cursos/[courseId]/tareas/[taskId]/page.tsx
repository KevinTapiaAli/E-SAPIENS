import { notFound } from "next/navigation";
import { isWorkspaceRole } from "@/features/portal/navigation";
import { portalSession } from "@/features/portal/server";
import { isResourceId } from "@/features/classroom/server";
import { TaskWorkspace } from "@/features/teaching/workspace";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ role: string; courseId: string; taskId: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { role, courseId, taskId } = await params;
  const { cursor } = await searchParams;
  if (
    !isWorkspaceRole(role) ||
    !isResourceId(courseId) ||
    !isResourceId(taskId)
  )
    notFound();
  return (
    <TaskWorkspace
      role={role}
      courseId={courseId}
      taskId={taskId}
      user={await portalSession()}
      cursor={isResourceId(cursor ?? "") ? cursor : undefined}
    />
  );
}

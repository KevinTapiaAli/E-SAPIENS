import "server-only";
import type {
  ClassroomCourse,
  ClassroomLesson,
  ClassroomLessonSummary,
  CourseOffering,
  EnrollmentAccess,
  EnrollmentRequest,
  PublicPage,
} from "@esapiens/contracts";
import { isPublicPage, isRecord } from "@/shared/api/public-api";

const nullableText = (value: unknown) =>
  value === null || typeof value === "string";
export const isResourceId = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function isLesson(value: unknown): value is ClassroomLessonSummary {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.type === "string" &&
    typeof value.durationMinutes === "number" &&
    typeof value.completed === "boolean"
  );
}
export function isClassroomCourse(value: unknown): value is ClassroomCourse {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.enrollmentStatus === "string" &&
    typeof value.requiresExam === "boolean" &&
    Array.isArray(value.modules) &&
    value.modules.every(
      (m: unknown) =>
        isRecord(m) &&
        typeof m.id === "string" &&
        typeof m.title === "string" &&
        typeof m.description === "string" &&
        typeof m.available === "boolean" &&
        typeof m.accessReason === "string" &&
        nullableText(m.accessUntil) &&
        Array.isArray(m.lessons) &&
        m.lessons.every(isLesson),
    )
  );
}
export function isClassroomLesson(value: unknown): value is ClassroomLesson {
  return (
    isLesson(value) &&
    isRecord(value) &&
    typeof value.courseId === "string" &&
    typeof value.courseTitle === "string" &&
    typeof value.moduleTitle === "string" &&
    nullableText(value.content) &&
    typeof value.canComplete === "boolean"
  );
}
export function isOfferings(
  value: unknown,
): value is PublicPage<CourseOffering> {
  return isPublicPage(
    value,
    (v: unknown): v is CourseOffering =>
      isRecord(v) &&
      typeof v.id === "string" &&
      typeof v.title === "string" &&
      typeof v.category === "string" &&
      typeof v.description === "string" &&
      nullableText(v.enrollmentStatus) &&
      nullableText(v.requestStatus) &&
      nullableText(v.requestReason),
  );
}
export function isEnrollmentRequests(
  value: unknown,
): value is PublicPage<EnrollmentRequest> {
  return isPublicPage(
    value,
    (v: unknown): v is EnrollmentRequest =>
      isRecord(v) &&
      typeof v.id === "string" &&
      typeof v.student === "string" &&
      typeof v.course === "string" &&
      typeof v.status === "string" &&
      typeof v.requestedAt === "string" &&
      nullableText(v.reason) &&
      nullableText(v.enrollmentId),
  );
}
export function isEnrollmentAccess(value: unknown): value is EnrollmentAccess {
  return (
    isRecord(value) &&
    nullableText(value.nextGrantCursor) &&
    typeof value.id === "string" &&
    typeof value.student === "string" &&
    typeof value.course === "string" &&
    typeof value.status === "string" &&
    Array.isArray(value.modules) &&
    value.modules.every(
      (m: unknown) =>
        isRecord(m) &&
        typeof m.id === "string" &&
        typeof m.title === "string" &&
        typeof m.published === "boolean" &&
        typeof m.order === "number",
    ) &&
    Array.isArray(value.grants) &&
    value.grants.every(
      (g: unknown) =>
        isRecord(g) &&
        typeof g.id === "string" &&
        typeof g.module === "string" &&
        typeof g.startsAt === "string" &&
        typeof g.endsAt === "string" &&
        nullableText(g.revokedAt) &&
        nullableText(g.reason) &&
        ["institutional", "purchase"].includes(String(g.source)),
    )
  );
}

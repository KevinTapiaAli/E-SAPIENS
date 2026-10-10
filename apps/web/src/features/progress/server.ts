import "server-only";
import type {
  AcademicProgressSummary,
  PublicPage,
  StudentProgress,
  StudentProgressDetail,
} from "@esapiens/contracts";
import { isRecord, isPublicPage } from "@/shared/api/public-api";

const count = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0;
const instant = (v: unknown): v is string =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
export function isProgressSummary(
  value: unknown,
): value is AcademicProgressSummary {
  return (
    isRecord(value) &&
    [
      value.enrollments,
      value.students,
      value.notStarted,
      value.inProgress,
      value.completed,
      value.withoutContent,
      value.inactive,
      value.withoutCoverage,
    ].every(count) &&
    (value.averagePercent === null ||
      (count(value.averagePercent) && value.averagePercent <= 100))
  );
}
function isStudentProgress(value: unknown): value is StudentProgress {
  return (
    isRecord(value) &&
    [
      value.id,
      value.student,
      value.courseId,
      value.course,
      value.enrollmentStatus,
      value.accountStatus,
    ].every((v) => typeof v === "string") &&
    count(value.totalLessons) &&
    count(value.completedLessons) &&
    [
      value.gradedTasks,
      value.submittedTasks,
      value.attendedClasses,
      value.finishedClasses,
    ].every(count) &&
    (value.taskAverage === null ||
      (typeof value.taskAverage === "number" &&
        value.taskAverage >= 0 &&
        value.taskAverage <= 100)) &&
    value.completedLessons <= value.totalLessons &&
    (value.percent === null ||
      (count(value.percent) && value.percent <= 100)) &&
    (value.lastActivityAt === null || instant(value.lastActivityAt)) &&
    instant(value.enrolledAt) &&
    ["sin_contenido", "sin_iniciar", "en_curso", "completado"].includes(
      String(value.stage),
    ) &&
    typeof value.inactive === "boolean" &&
    typeof value.hasCoverage === "boolean"
  );
}
export function isProgressPage(
  value: unknown,
): value is PublicPage<StudentProgress> {
  return isPublicPage(value, isStudentProgress);
}
export function isProgressDetail(
  value: unknown,
): value is StudentProgressDetail {
  return (
    isRecord(value) &&
    isStudentProgress(value.enrollment) &&
    Array.isArray(value.modules) &&
    value.modules.every(
      (m: unknown) =>
        isRecord(m) &&
        typeof m.id === "string" &&
        typeof m.title === "string" &&
        count(m.totalLessons) &&
        count(m.completedLessons) &&
        m.completedLessons <= m.totalLessons &&
        (m.lastActivityAt === null || instant(m.lastActivityAt)) &&
        typeof m.available === "boolean" &&
        typeof m.hasCoverage === "boolean",
    )
  );
}

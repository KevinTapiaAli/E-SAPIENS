import "server-only";
import type {
  PublicPage,
  TaskSubmission,
  TeachingCourse,
  TeachingMaterial,
  TeachingTask,
} from "@esapiens/contracts";
import { isPublicPage, isRecord } from "@/shared/api/public-api";
const number = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const date = (v: unknown) =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
const textOrNull = (v: unknown) => v === null || typeof v === "string";
export function isTeachingCourse(v: unknown): v is TeachingCourse {
  return (
    isRecord(v) &&
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    Array.isArray(v.modules) &&
    v.modules.every(
      (m: unknown) =>
        isRecord(m) &&
        typeof m.id === "string" &&
        typeof m.title === "string" &&
        typeof m.published === "boolean",
    )
  );
}
export function isMaterial(v: unknown): v is TeachingMaterial {
  return (
    isRecord(v) &&
    [v.id, v.moduleId, v.module, v.title, v.content].every(
      (x) => typeof x === "string",
    ) &&
    ["apoyo", "contenido", "referencia"].includes(String(v.kind)) &&
    textOrNull(v.url) &&
    typeof v.published === "boolean" &&
    number(v.revision)
  );
}
export function isTeachingTask(v: unknown): v is TeachingTask {
  return (
    isRecord(v) &&
    [v.id, v.moduleId, v.module, v.title, v.instructions].every(
      (x) => typeof x === "string",
    ) &&
    date(v.dueAt) &&
    typeof v.allowLate === "boolean" &&
    typeof v.published === "boolean" &&
    [v.maxSubmissions, v.revision, v.submissionCount, v.pendingReviews].every(
      number,
    )
  );
}
export const isMaterials = (v: unknown): v is PublicPage<TeachingMaterial> =>
  isPublicPage(v, isMaterial);
export const isTasks = (v: unknown): v is PublicPage<TeachingTask> =>
  isPublicPage(v, isTeachingTask);
export function isSubmissions(v: unknown): v is PublicPage<TaskSubmission> {
  return isPublicPage(
    v,
    (s: unknown): s is TaskSubmission =>
      isRecord(s) &&
      typeof s.id === "string" &&
      typeof s.student === "string" &&
      number(s.attempt) &&
      textOrNull(s.text) &&
      typeof s.comment === "string" &&
      textOrNull(s.url) &&
      date(s.submittedAt) &&
      (s.grade === null ||
        (typeof s.grade === "number" && s.grade >= 0 && s.grade <= 100)) &&
      Array.isArray(s.feedback) &&
      s.feedback.every(
        (f: unknown) =>
          isRecord(f) &&
          typeof f.id === "string" &&
          typeof f.teacher === "string" &&
          typeof f.comment === "string" &&
          date(f.createdAt),
      ),
  );
}

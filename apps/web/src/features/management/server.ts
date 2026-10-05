import "server-only";
import type {
  ManagedCourse,
  ManagedLesson,
  ManagedLessonDetail,
  ManagedModule,
} from "@esapiens/contracts";
import { isRecord } from "@/shared/api/public-api";
const text = (v: unknown) => typeof v === "string";
const number = (v: unknown) => typeof v === "number" && Number.isFinite(v);
function isLesson(v: unknown): v is ManagedLesson {
  return (
    isRecord(v) &&
    text(v.id) &&
    text(v.title) &&
    text(v.type) &&
    (v.content === null || text(v.content)) &&
    number(v.order) &&
    number(v.durationMinutes) &&
    number(v.revision) &&
    typeof v.published === "boolean" &&
    typeof v.required === "boolean"
  );
}
function isModule(v: unknown): v is ManagedModule {
  return (
    isRecord(v) &&
    text(v.id) &&
    text(v.title) &&
    text(v.description) &&
    number(v.order) &&
    number(v.revision) &&
    typeof v.published === "boolean" &&
    Array.isArray(v.lessons) &&
    v.lessons.every(isLesson)
  );
}
export function isManagedCourse(v: unknown): v is ManagedCourse {
  return (
    isRecord(v) &&
    [
      v.id,
      v.title,
      v.category,
      v.description,
      v.objectives,
      v.level,
      v.status,
      v.exam,
    ].every(text) &&
    number(v.durationHours) &&
    number(v.revision) &&
    typeof v.enrolled === "boolean" &&
    typeof v.requireLessons === "boolean" &&
    Array.isArray(v.modules) &&
    v.modules.every(isModule)
  );
}
export function isManagedLessonDetail(v: unknown): v is ManagedLessonDetail {
  return (
    isRecord(v) &&
    [v.courseId, v.courseTitle, v.moduleId, v.moduleTitle].every(text) &&
    typeof v.enrolled === "boolean" &&
    isLesson(v.lesson)
  );
}

import type {
  PublicCourse,
  PublicCourseDetail,
  PublicPage,
} from "@esapiens/contracts";
import { isPublicPage, isRecord, readPublicApi } from "@/shared/api/public-api";

function isCourse(value: unknown): value is PublicCourse {
  return (
    isRecord(value) &&
    [
      "id",
      "slug",
      "title",
      "description",
      "category",
      "level",
      "language",
    ].every((key) => typeof value[key] === "string") &&
    typeof value.durationHours === "number" &&
    Number.isFinite(value.durationHours)
  );
}
function isCourseDetail(value: unknown): value is PublicCourseDetail {
  if (!isRecord(value) || !isCourse(value)) return false;
  return (
    typeof value.objectives === "string" &&
    Array.isArray(value.modules) &&
    value.modules.every(
      (module: unknown) =>
        isRecord(module) &&
        typeof module.id === "string" &&
        typeof module.title === "string" &&
        Array.isArray(module.lessons) &&
        module.lessons.every(
          (lesson: unknown) =>
            isRecord(lesson) &&
            typeof lesson.id === "string" &&
            typeof lesson.title === "string" &&
            typeof lesson.type === "string" &&
            typeof lesson.durationMinutes === "number",
        ),
    )
  );
}
export function getCourses(query: string) {
  return readPublicApi(
    `/courses?${query}`,
    (value): value is PublicPage<PublicCourse> => isPublicPage(value, isCourse),
  );
}
export function getCourse(slug: string) {
  return readPublicApi(`/courses/${encodeURIComponent(slug)}`, isCourseDetail);
}

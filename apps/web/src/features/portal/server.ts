import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type {
  AcademicCourse,
  AcademicEnrollment,
  AcademicOverview,
  AcademicPerson,
  PublicPage,
} from "@esapiens/contracts";
import { isRecord, isPublicPage } from "@/shared/api/public-api";
import { readIdentity, isSessionUser } from "@/features/auth/server";
import { isProgressSummary } from "@/features/progress/server";

export const portalSession = cache(async () => {
  const result = await readIdentity("me", isSessionUser);
  if (result.status === 401) redirect("/login");
  if (!result.data) throw new Error("No se pudo consultar la sesión.");
  return result.data;
});

export function isAcademicCourse(value: unknown): value is AcademicCourse {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.category === "string" &&
    typeof value.status === "string" &&
    (value.enrollmentStatus === null ||
      typeof value.enrollmentStatus === "string") &&
    Array.isArray(value.teachers) &&
    value.teachers.every((teacher: unknown) => typeof teacher === "string") &&
    (value.enrollmentCount === null ||
      typeof value.enrollmentCount === "number") &&
    typeof value.totalLessons === "number" &&
    (value.completedLessons === null ||
      typeof value.completedLessons === "number")
  );
}
export const isAcademicCourses = (
  value: unknown,
): value is PublicPage<AcademicCourse> => isPublicPage(value, isAcademicCourse);
export function isAcademicPeople(
  value: unknown,
): value is PublicPage<AcademicPerson> {
  return isPublicPage(
    value,
    (person: unknown): person is AcademicPerson =>
      isRecord(person) &&
      typeof person.id === "string" &&
      typeof person.firstName === "string" &&
      typeof person.lastName === "string" &&
      typeof person.email === "string" &&
      typeof person.status === "string" &&
      (person.specialty === null || typeof person.specialty === "string") &&
      (person.curriculumUrl === null ||
        typeof person.curriculumUrl === "string") &&
      (person.qualificationReview === null ||
        typeof person.qualificationReview === "string") &&
      (person.qualificationReviewedAt === null ||
        typeof person.qualificationReviewedAt === "string") &&
      (person.profileRevision === null ||
        typeof person.profileRevision === "number") &&
      Array.isArray(person.roles) &&
      person.roles.every((role: unknown) => typeof role === "string"),
  );
}
export function isAcademicEnrollments(
  value: unknown,
): value is PublicPage<AcademicEnrollment> {
  return isPublicPage(
    value,
    (enrollment: unknown): enrollment is AcademicEnrollment =>
      isRecord(enrollment) &&
      typeof enrollment.id === "string" &&
      typeof enrollment.student === "string" &&
      typeof enrollment.course === "string" &&
      typeof enrollment.status === "string" &&
      typeof enrollment.enrolledAt === "string" &&
      Number.isFinite(Date.parse(enrollment.enrolledAt)) &&
      (enrollment.reason === null || typeof enrollment.reason === "string"),
  );
}
export function isAcademicOverview(value: unknown): value is AcademicOverview {
  const metric = (item: unknown) =>
    isRecord(item) &&
    typeof item.label === "string" &&
    typeof item.value === "number" &&
    Number.isFinite(item.value);
  return (
    isRecord(value) &&
    Array.isArray(value.metrics) &&
    value.metrics.every(metric) &&
    Array.isArray(value.distribution) &&
    value.distribution.every(metric) &&
    (value.progressSummary === undefined ||
      isProgressSummary(value.progressSummary)) &&
    (value.courseDistribution === undefined ||
      (Array.isArray(value.courseDistribution) &&
        value.courseDistribution.every(metric))) &&
    Array.isArray(value.courses) &&
    value.courses.every(isAcademicCourse)
  );
}

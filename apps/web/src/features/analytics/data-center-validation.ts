import "server-only";
import type { DataCenterResult } from "@esapiens/contracts";
import { isRecord } from "@/shared/api/public-api";

const count = (v: unknown) =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const date = (v: unknown) =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
const courses = (v: unknown) =>
  Array.isArray(v) &&
  v.every(
    (c) =>
      isRecord(c) && typeof c.id === "string" && typeof c.title === "string",
  );
export function isDataCenterResult(v: unknown): v is DataCenterResult {
  if (
    !isRecord(v) ||
    !isRecord(v.period) ||
    !isRecord(v.summary) ||
    !isRecord(v.traffic)
  )
    return false;
  const summary = v.summary;
  const requestStates = v.requestStates;
  return (
    date(v.generatedAt) &&
    date(v.trackingSince) &&
    [7, 30, 90].includes(Number(v.period.days)) &&
    [v.period.from, v.period.to, v.period.previousFrom].every(date) &&
    Object.entries(v.summary).every(([key, n]) =>
      key === "averageProgress"
        ? n === null || (typeof n === "number" && n >= 0 && n <= 100)
        : count(n),
    ) &&
    [
      "users",
      "approvedUsers",
      "approvedStudents",
      "approvedTeachers",
      "publishedCourses",
      "draftCourses",
      "reviewCourses",
      "archivedCourses",
      "activeEnrollments",
      "enrolledStudents",
      "pendingRequests",
      "averageProgress",
      "progressDenominator",
      "inactiveStudents",
      "withoutCoverage",
      "withCoverage",
      "pendingSubmissions",
      "gradedSubmissions",
      "unassignedCourses",
      "activeParticipants",
      "previousParticipants",
    ].every((key) => key in summary) &&
    [
      "visitors",
      "previousVisitors",
      "courseVisitors",
      "accountConversions",
      "enrollmentConversions",
      "accountRequests",
      "enrollmentRequests",
    ].every((key) => count((v.traffic as Record<string, unknown>)[key])) &&
    Array.isArray(v.traffic.trend) &&
    v.traffic.trend.every(
      (p) =>
        isRecord(p) &&
        typeof p.day === "string" &&
        (p.visitors === null || count(p.visitors)),
    ) &&
    Array.isArray(v.traffic.topCourses) &&
    v.traffic.topCourses.every(
      (c) =>
        isRecord(c) &&
        typeof c.id === "string" &&
        typeof c.title === "string" &&
        count(c.visitors) &&
        count(c.requests),
    ) &&
    Array.isArray(v.courseComparison) &&
    v.courseComparison.every(
      (c) =>
        isRecord(c) &&
        typeof c.id === "string" &&
        typeof c.title === "string" &&
        count(c.students) &&
        (c.averageProgress === null || typeof c.averageProgress === "number"),
    ) &&
    isRecord(requestStates) &&
    [
      requestStates.pending,
      requestStates.approved,
      requestStates.rejected,
    ].every(count) &&
    typeof v.trafficComparable === "boolean" &&
    typeof v.courseOptionsTruncated === "boolean" &&
    courses(v.courseOptions) &&
    typeof v.indicator === "string" &&
    ["students", "courses", "teachers", "requests", "traffic"].includes(
      v.indicator,
    ) &&
    count(v.page) &&
    count(v.pageSize) &&
    count(v.total) &&
    Array.isArray(v.columns) &&
    v.columns.every(
      (c) =>
        isRecord(c) &&
        typeof c.key === "string" &&
        typeof c.label === "string" &&
        (c.unit === undefined ||
          ["percent", "date", "boolean"].includes(String(c.unit))),
    ) &&
    Array.isArray(v.items) &&
    v.items.every(
      (r) =>
        isRecord(r) &&
        typeof r.id === "string" &&
        typeof r.label === "string" &&
        (r.courseId === null || typeof r.courseId === "string") &&
        courses(r.courses) &&
        isRecord(r.values) &&
        Object.values(r.values).every(
          (c) =>
            c === null ||
            typeof c === "string" ||
            typeof c === "boolean" ||
            (typeof c === "number" && Number.isFinite(c)),
        ),
    ) &&
    Array.isArray(v.recommendations) &&
    v.recommendations.every(
      (r) =>
        isRecord(r) &&
        typeof r.indicator === "string" &&
        typeof r.value === "number" &&
        typeof r.title === "string" &&
        typeof r.detail === "string" &&
        ["students", "courses", "teachers", "requests"].includes(
          String(r.target),
        ),
    )
  );
}

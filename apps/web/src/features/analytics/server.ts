import "server-only";
import type { ExecutiveDashboard } from "@esapiens/contracts";
import { isRecord } from "@/shared/api/public-api";

const count = (n: unknown) =>
  typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
const instant = (v: unknown) =>
  typeof v === "string" && Number.isFinite(Date.parse(v));

export function isExecutiveDashboard(
  value: unknown,
): value is ExecutiveDashboard {
  if (
    !isRecord(value) ||
    !isRecord(value.period) ||
    !isRecord(value.traffic) ||
    !isRecord(value.learning)
  )
    return false;
  const { period, traffic, learning } = value;
  return (
    instant(value.generatedAt) &&
    instant(value.trackingSince) &&
    [7, 30, 90].includes(Number(period.days)) &&
    typeof period.days === "number" &&
    [period.from, period.to, period.previousFrom].every(instant) &&
    [
      traffic.visitors,
      traffic.previousVisitors,
      traffic.courseVisitors,
      traffic.accountConversions,
      traffic.enrollmentConversions,
      traffic.accountRequests,
      traffic.enrollmentRequests,
    ].every(count) &&
    (traffic.accountConversions as number) <= (traffic.visitors as number) &&
    (traffic.enrollmentConversions as number) <=
      (traffic.courseVisitors as number) &&
    Array.isArray(traffic.trend) &&
    traffic.trend.every(
      (p: unknown) =>
        isRecord(p) &&
        typeof p.day === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(p.day) &&
        (p.visitors === null || count(p.visitors)),
    ) &&
    Array.isArray(traffic.topCourses) &&
    traffic.topCourses.every(
      (c: unknown) =>
        isRecord(c) &&
        typeof c.id === "string" &&
        typeof c.title === "string" &&
        count(c.visitors) &&
        count(c.requests),
    ) &&
    [
      learning.enrolledStudents,
      learning.weeklyActive,
      learning.previousWeeklyActive,
      learning.inactiveStudents,
      learning.neverActive,
      learning.ungradedSubmissions,
      learning.pendingAccounts,
      learning.pendingEnrollments,
      learning.publishedCourses,
      learning.unassignedCourses,
    ].every(count) &&
    Array.isArray(learning.students) &&
    learning.students.every(
      (s: unknown) =>
        isRecord(s) &&
        typeof s.id === "string" &&
        typeof s.name === "string" &&
        typeof s.enrollmentId === "string" &&
        instant(s.enrolledAt) &&
        (s.lastActivityAt === null || instant(s.lastActivityAt)),
    )
  );
}

import type { SchemaObject } from '@nestjs/swagger';

const timestamp: SchemaObject = { type: 'string', format: 'date-time' };
const uuid: SchemaObject = { type: 'string', format: 'uuid' };
const count: SchemaObject = { type: 'integer', minimum: 0, example: 0 };
function object(properties: Record<string, SchemaObject>): SchemaObject {
  return { type: 'object', required: Object.keys(properties), properties };
}
function counters(names: string[]): Record<string, SchemaObject> {
  return Object.fromEntries(names.map((name) => [name, count]));
}

export const executiveDashboardSchema: SchemaObject = object({
  generatedAt: timestamp,
  period: object({
    days: { type: 'integer', enum: [7, 30, 90] },
    from: timestamp,
    to: timestamp,
    previousFrom: timestamp,
  }),
  trackingSince: timestamp,
  traffic: object({
    ...counters([
      'visitors',
      'previousVisitors',
      'courseVisitors',
      'accountConversions',
      'enrollmentConversions',
      'accountRequests',
      'enrollmentRequests',
    ]),
    trend: {
      type: 'array',
      items: object({
        day: { type: 'string', format: 'date' },
        visitors: { ...count, nullable: true },
      }),
    },
    topCourses: {
      type: 'array',
      items: object({
        id: uuid,
        title: { type: 'string' },
        visitors: count,
        requests: count,
      }),
    },
  }),
  learning: object({
    ...counters([
      'enrolledStudents',
      'weeklyActive',
      'previousWeeklyActive',
      'inactiveStudents',
      'neverActive',
      'ungradedSubmissions',
      'pendingAccounts',
      'pendingEnrollments',
      'publishedCourses',
      'unassignedCourses',
    ]),
    students: {
      type: 'array',
      items: object({
        id: uuid,
        name: { type: 'string' },
        lastActivityAt: { ...timestamp, nullable: true },
        enrolledAt: timestamp,
        enrollmentId: uuid,
      }),
    },
  }),
});

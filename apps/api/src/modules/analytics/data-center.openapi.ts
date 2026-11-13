import type { SchemaObject } from '@nestjs/swagger';
import { executiveDashboardSchema } from './analytics.openapi';

const count: SchemaObject = { type: 'integer', minimum: 0 };
const text: SchemaObject = { type: 'string' };
const course: SchemaObject = {
  type: 'object',
  required: ['id', 'title'],
  properties: { id: { type: 'string', format: 'uuid' }, title: text },
};
export const dataCenterSchema: SchemaObject = {
  type: 'object',
  required: [
    'generatedAt',
    'period',
    'trackingSince',
    'traffic',
    'trafficComparable',
    'summary',
    'recommendations',
    'indicator',
    'columns',
    'items',
    'page',
    'pageSize',
    'total',
    'courseOptions',
    'courseOptionsTruncated',
  ],
  properties: {
    generatedAt: { type: 'string', format: 'date-time' },
    period: executiveDashboardSchema.properties!.period as SchemaObject,
    trackingSince: { type: 'string', format: 'date-time' },
    traffic: executiveDashboardSchema.properties!.traffic as SchemaObject,
    trafficComparable: {
      type: 'boolean',
      description: 'El período anterior completo tiene medición web.',
    },
    summary: {
      type: 'object',
      properties: {
        ...Object.fromEntries(
          [
            'users',
            'approvedUsers',
            'approvedStudents',
            'approvedTeachers',
            'publishedCourses',
            'draftCourses',
            'reviewCourses',
            'archivedCourses',
            'activeEnrollments',
            'enrolledStudents',
            'pendingRequests',
            'progressDenominator',
            'inactiveStudents',
            'withoutCoverage',
            'withCoverage',
            'pendingSubmissions',
            'gradedSubmissions',
            'unassignedCourses',
            'activeParticipants',
            'previousParticipants',
          ].map((k) => [k, count]),
        ),
        averageProgress: {
          type: 'number',
          nullable: true,
          minimum: 0,
          maximum: 100,
          description:
            'Media de porcentajes de matrículas activas con lecciones publicadas. Denominador: progressDenominator.',
        },
      },
    },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          indicator: text,
          value: { type: 'number' },
          title: text,
          detail: text,
          target: text,
        },
      },
    },
    indicator: {
      type: 'string',
      enum: ['students', 'courses', 'teachers', 'requests', 'traffic'],
    },
    columns: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: text,
          label: text,
          unit: { type: 'string', enum: ['percent', 'date', 'boolean'] },
        },
      },
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'label', 'courseId', 'courses', 'values'],
        properties: {
          id: text,
          label: text,
          courseId: { type: 'string', format: 'uuid', nullable: true },
          courses: { type: 'array', items: course },
          values: {
            type: 'object',
            additionalProperties: {
              oneOf: [
                { type: 'string' },
                { type: 'number' },
                { type: 'boolean' },
              ],
              nullable: true,
            },
          },
        },
      },
    },
    page: count,
    pageSize: count,
    total: count,
    courseOptions: { type: 'array', items: course },
    courseOptionsTruncated: { type: 'boolean' },
    courseComparison: {
      type: 'array',
      description:
        'Primeras 10 materias por nombre en el ámbito completo filtrado.',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: text,
          students: count,
          averageProgress: { type: 'number', nullable: true },
        },
      },
    },
    requestStates: {
      type: 'object',
      properties: { pending: count, approved: count, rejected: count },
    },
  },
};

import type { SchemaObject } from '@nestjs/swagger';

const courseSchema: SchemaObject = {
  type: 'object',
  required: [
    'id',
    'slug',
    'title',
    'description',
    'category',
    'level',
    'language',
    'durationHours',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    slug: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    category: { type: 'string' },
    level: { type: 'string' },
    language: { type: 'string' },
    durationHours: { type: 'number' },
  },
};

export const coursePageSchema: SchemaObject = {
  type: 'object',
  required: ['items', 'nextCursor'],
  properties: {
    items: { type: 'array', items: courseSchema },
    nextCursor: { type: 'string', format: 'uuid', nullable: true },
  },
};

export const courseDetailSchema: SchemaObject = {
  ...courseSchema,
  required: [...(courseSchema.required ?? []), 'objectives', 'modules'],
  properties: {
    ...courseSchema.properties,
    objectives: { type: 'string' },
    modules: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'lessons'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          lessons: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'title', 'type', 'durationMinutes'],
              properties: {
                id: { type: 'string', format: 'uuid' },
                title: { type: 'string' },
                type: { type: 'string' },
                durationMinutes: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  },
};

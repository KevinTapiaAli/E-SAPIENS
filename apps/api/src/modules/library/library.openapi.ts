import type { SchemaObject } from '@nestjs/swagger';

const librarySchema: SchemaObject = {
  type: 'object',
  required: [
    'id',
    'title',
    'type',
    'description',
    'publisher',
    'year',
    'isbn',
    'authors',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    type: { type: 'string', enum: ['libro', 'articulo', 'guia', 'video'] },
    description: { type: 'string' },
    publisher: { type: 'string', nullable: true },
    year: { type: 'integer', nullable: true },
    isbn: { type: 'string', nullable: true },
    authors: { type: 'array', items: { type: 'string' } },
  },
};
export const libraryPageSchema: SchemaObject = {
  type: 'object',
  required: ['items', 'nextCursor'],
  properties: {
    items: { type: 'array', items: librarySchema },
    nextCursor: { type: 'string', format: 'uuid', nullable: true },
  },
};
export const libraryDetailSchema: SchemaObject = {
  ...librarySchema,
  required: [...(librarySchema.required ?? []), 'sections'],
  properties: {
    ...librarySchema.properties,
    sections: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'pageStart', 'pageEnd'],
        properties: {
          title: { type: 'string' },
          pageStart: { type: 'integer', nullable: true },
          pageEnd: { type: 'integer', nullable: true },
        },
      },
    },
  },
};

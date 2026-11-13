import type { SchemaObject } from '@nestjs/swagger';
import type { SessionUser } from '@esapiens/contracts';

const example: SessionUser = {
  id: '10000000-0000-4000-8000-000000000001',
  email: 'estudiante@example.test',
  firstName: 'Ana',
  lastName: 'Ejemplo',
  timeZone: 'America/La_Paz',
  roles: ['estudiante'],
  permissions: ['classroom.study'],
};

export const sessionUserSchema: SchemaObject = {
  type: 'object',
  description:
    'Identidad de una cuenta aprobada. Ejemplo ficticio, sin credenciales ni token de sesión.',
  required: [
    'id',
    'email',
    'firstName',
    'lastName',
    'timeZone',
    'roles',
    'permissions',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    timeZone: { type: 'string' },
    roles: { type: 'array', items: { type: 'string' } },
    permissions: { type: 'array', items: { type: 'string' } },
  },
  example,
};

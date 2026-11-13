import {
  INestApplication,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { SessionUser } from '@esapiens/contracts';
import { configureHttp } from '../src/common/http/configure-http';
import { GlobalExceptionFilter } from '../src/common/http/filters/global-exception.filter';
import { DataCenterController } from '../src/modules/analytics/data-center.controller';
import { DataCenterService } from '../src/modules/analytics/data-center.service';
import { IdentityService } from '../src/modules/identity/identity.service';
import { IdentitySecurityService } from '../src/modules/identity/identity-security.service';

const base = '/api/v1/analytics/data-center';
const courseId = '4fd08c8c-5538-4fb2-a91a-70983ba4ab92';
function user(
  role: string,
  permissions = ['dashboard.admin', 'academic.read'],
): SessionUser {
  return {
    id: courseId,
    email: 'test@example.test',
    firstName: 'Prueba',
    lastName: 'HTTP',
    roles: [role],
    permissions,
    timeZone: 'America/La_Paz',
  };
}
const users: Record<string, SessionUser> = {
  admin: user('administrador'),
  general: user('administrador_general'),
  student: user('estudiante'),
  teacher: user('docente'),
  missingAcademic: user('administrador', ['dashboard.admin']),
  missingDashboard: user('administrador', ['academic.read']),
  none: user('administrador', []),
};

describe('Centro de Datos: boundary HTTP and real identity authorization', () => {
  let app: INestApplication;
  const data = { query: jest.fn(), export: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [DataCenterController],
      providers: [
        { provide: DataCenterService, useValue: data },
        {
          provide: IdentitySecurityService,
          useValue: {
            token: (req: { headers: Record<string, string> }) =>
              req.headers['x-test-user'],
          },
        },
        {
          provide: IdentityService,
          useValue: {
            authenticate: async (token: string) => {
              if (!users[token]) throw new UnauthorizedException();
              return users[token];
            },
            authorize: IdentityService.prototype.authorize.bind(
              {} as IdentityService,
            ),
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    configureHttp(app);
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    data.query.mockReset().mockResolvedValue({ items: [], total: 0 });
    data.export.mockReset().mockResolvedValue({
      filename: 'safe.csv',
      csv: '"Nombre"\r\n',
      rows: 0,
      total: 0,
      truncated: false,
      privateMetadata: 'SECRET',
    });
  });
  const get = (path = base, actor = 'admin') =>
    request(app.getHttpServer()).get(path).set('x-test-user', actor);
  it.each(['admin', 'general'])(
    'authorizes %s with both permissions',
    async (actor) => {
      const result = await get(base, actor).expect(200);
      expect(result.body).toEqual({ items: [], total: 0 });
      expect(result.headers['cache-control']).toBe('private, no-store');
      await get(`${base}/export.csv`, actor).expect(200);
    },
  );
  it.each([
    'student',
    'teacher',
    'missingAcademic',
    'missingDashboard',
    'none',
  ])('denies %s for reads and CSV', async (actor) => {
    await get(base, actor).expect(403);
    await get(`${base}/export.csv`, actor).expect(403);
    expect(data.query).not.toHaveBeenCalled();
    expect(data.export).not.toHaveBeenCalled();
  });
  it('requires a session', async () => {
    await request(app.getHttpServer()).get(base).expect(401);
    expect(data.query).not.toHaveBeenCalled();
  });
  it('passes intersecting filters and numeric pagination to both operations', async () => {
    const filters = {
      days: '90',
      courseId,
      state: 'activa',
      stage: 'sin_cobertura',
      courseState: 'publicado',
      requestState: 'pendiente',
      indicator: 'students',
      page: '2',
      pageSize: '10',
      sort: 'progress',
      direction: 'desc',
    };
    await get().query(filters).expect(200);
    await get(`${base}/export.csv`).query(filters).expect(200);
    const expected = { ...filters, page: 2, pageSize: 10 };
    expect(data.query).toHaveBeenCalledWith(expect.objectContaining(expected));
    expect(data.export).toHaveBeenCalledWith(expect.objectContaining(expected));
  });
  it.each(['7', '30', '90'])('accepts %s days', async (days) => {
    await get().query({ days }).expect(200);
    expect(data.query).toHaveBeenCalledWith(expect.objectContaining({ days }));
  });
  it.each([
    ['days', '31'],
    ['courseId', "' OR 1=1"],
    ['state', 'deleted'],
    ['stage', 'failed'],
    ['courseState', 'deleted'],
    ['requestState', 'deleted'],
    ['indicator', 'secrets'],
    ['page', '0'],
    ['page', '10001'],
    ['page', '1.5'],
    ['pageSize', '101'],
    ['pageSize', '0'],
    ['sort', 'name; DROP TABLE lms.usuarios'],
    ['direction', 'DESC; SELECT 1'],
    ['debug', 'true'],
  ])('rejects %s=%s before querying', async (key, value) => {
    await get()
      .query({ [key]: value })
      .expect(400);
    expect(data.query).not.toHaveBeenCalled();
  });
  it.each([
    'days=7&days=90',
    'page=1&page=2',
    'sort=name&sort=activity',
    'indicator=students&indicator=traffic',
  ])('rejects repeated filters %s', async (query) => {
    await get(`${base}?${query}`).expect(400);
    expect(data.query).not.toHaveBeenCalled();
  });
  it('validates CSV filters independently', async () => {
    await get(`${base}/export.csv`).query({ days: 91 }).expect(400);
    expect(data.export).not.toHaveBeenCalled();
  });
  it('exports empty CSV with bounded metadata and no private properties', async () => {
    const result = await get(`${base}/export.csv`).expect(200);
    expect(result.headers['content-type']).toMatch(/^text\/csv/);
    expect(result.headers['content-disposition']).toContain('safe.csv');
    expect(result.headers['x-export-truncated']).toBe('false');
    expect(result.headers['x-export-rows']).toBe('0');
    expect(result.text).toBe('"Nombre"\r\n');
    expect(result.text).not.toContain('SECRET');
  });
  it.each([false, true])(
    'reports analytics unavailability safely, export=%s',
    async (csv) => {
      const failure = new ServiceUnavailableException(
        {
          code: 'ANALYTICS_SERVICE_UNAVAILABLE',
          message: 'Analítica no disponible',
        },
        { cause: new Error('SECRET SQL SELECT password_hash') },
      );
      (csv ? data.export : data.query).mockRejectedValueOnce(failure);
      const result = await get(csv ? `${base}/export.csv` : base).expect(503);
      expect(result.body.error.code).toBe('ANALYTICS_SERVICE_UNAVAILABLE');
      expect(JSON.stringify(result.body)).not.toMatch(
        /SECRET|password_hash|SELECT|stack/,
      );
    },
  );
});

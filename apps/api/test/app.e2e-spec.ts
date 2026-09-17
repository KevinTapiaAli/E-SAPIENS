import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('E-SAPIENS Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api/v1');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health debe responder 200', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('esapiens-api');
    expect(response.body.timestamp).toBeDefined();
  });

  it('GET /api/v1/health/ready debe validar PostgreSQL y Redis', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(200);

    expect(response.body.status).toBe('ok');

    expect(response.body.dependencies.database).toEqual({
      status: 'up',
      name: 'esapiens',
    });

    expect(response.body.dependencies.redis).toEqual({
      status: 'up',
    });
  });

  it('GET /api/v1/no-existe debe devolver el formato global de error', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/no-existe')
      .set('X-Request-Id', 'e2e-request-001')
      .expect(404);

    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Cannot GET /api/v1/no-existe',
        details: {},
        requestId: 'e2e-request-001',
      },
    });

    expect(response.headers['x-request-id']).toBe('e2e-request-001');
  });
});

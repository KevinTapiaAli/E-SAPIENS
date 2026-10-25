import { Test } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { ServiceClient } from '../../infrastructure/services/service-client';

describe('HealthController', () => {
  let controller: HealthController;

  const databaseServiceMock = {
    ping: jest.fn(),
  };

  const redisServiceMock = {
    readiness: jest.fn(),
  };
  const servicesMock = { request: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    servicesMock.request.mockResolvedValue({ status: 'ok' });

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: ServiceClient,
          useValue: servicesMock,
        },
        {
          provide: DatabaseService,
          useValue: databaseServiceMock,
        },
        {
          provide: RedisService,
          useValue: redisServiceMock,
        },
      ],
    }).compile();

    controller = moduleRef.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('debe indicar que la API está activa', () => {
      const result = controller.check();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('esapiens-api');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('readiness', () => {
    it('devuelve 503 si un servicio interno no responde', async () => {
      databaseServiceMock.ping.mockResolvedValue({ database: 'esapiens' });
      redisServiceMock.readiness.mockResolvedValue('PONG');
      servicesMock.request.mockRejectedValueOnce(new Error('Unavailable'));
      await expect(controller.readiness()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
    it('debe indicar PostgreSQL y Redis disponibles', async () => {
      databaseServiceMock.ping.mockResolvedValue({
        database: 'esapiens',
      });

      redisServiceMock.readiness.mockResolvedValue('PONG');

      const result = await controller.readiness();

      expect(result.status).toBe('ok');

      expect(result.dependencies.database).toEqual({
        status: 'up',
        name: 'esapiens',
      });

      expect(result.dependencies.redis).toEqual({
        status: 'up',
      });
    });
  });
});

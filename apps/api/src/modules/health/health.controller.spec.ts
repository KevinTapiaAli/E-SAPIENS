import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

describe('HealthController', () => {
  let controller: HealthController;

  const databaseServiceMock = {
    ping: jest.fn(),
  };

  const redisServiceMock = {
    ping: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
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
    it('debe indicar PostgreSQL y Redis disponibles', async () => {
      databaseServiceMock.ping.mockResolvedValue({
        database: 'esapiens',
      });

      redisServiceMock.ping.mockResolvedValue('PONG');

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

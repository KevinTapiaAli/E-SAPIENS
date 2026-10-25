import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { ServiceClient } from '../../infrastructure/services/service-client';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
    private readonly services: ServiceClient,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Comprobar que la API está activa',
  })
  check() {
    return {
      status: 'ok',
      service: 'esapiens-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Comprobar API, PostgreSQL, Redis, contenido y analítica',
  })
  async readiness() {
    const [databaseResult, redisResult, contentResult, analyticsResult] =
      await Promise.allSettled([
        this.databaseService.ping(),
        this.redisService.readiness(),
        this.services.request<{ status: string }>('content', 'health/ready'),
        this.services.request<{ status: string }>('analytics', 'health/ready'),
      ]);

    const databaseUp = databaseResult.status === 'fulfilled';

    const redisUp =
      redisResult.status === 'fulfilled' && redisResult.value === 'PONG';
    const contentUp =
      contentResult.status === 'fulfilled' &&
      contentResult.value.status === 'ok';
    const analyticsUp =
      analyticsResult.status === 'fulfilled' &&
      analyticsResult.value.status === 'ok';
    const ready = databaseUp && redisUp && contentUp && analyticsUp;

    const response = {
      status: ready ? 'ok' : 'error',
      service: 'esapiens-api',
      dependencies: {
        content: { status: contentUp ? 'up' : 'down' },
        analytics: { status: analyticsUp ? 'up' : 'down' },
        database: {
          status: databaseUp ? 'up' : 'down',
          name:
            databaseResult.status === 'fulfilled'
              ? databaseResult.value.database
              : undefined,
        },
        redis: {
          status: redisUp ? 'up' : 'down',
        },
      },
      timestamp: new Date().toISOString(),
    };

    if (!ready) {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }
}

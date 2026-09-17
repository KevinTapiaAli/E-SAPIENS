import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
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
    summary: 'Comprobar API, PostgreSQL y Redis',
  })
  async readiness() {
    const [databaseResult, redisResult] = await Promise.allSettled([
      this.databaseService.ping(),
      this.redisService.ping(),
    ]);

    const databaseUp = databaseResult.status === 'fulfilled';

    const redisUp =
      redisResult.status === 'fulfilled' && redisResult.value === 'PONG';

    const response = {
      status: databaseUp && redisUp ? 'ok' : 'error',
      service: 'esapiens-api',
      dependencies: {
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

    if (!databaseUp || !redisUp) {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }
}

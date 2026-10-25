import {
  Controller,
  Get,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DatabaseService } from '../infrastructure/database/database.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('health')
@ApiTags('Disponibilidad interna')
export class ServiceHealthController {
  constructor(
    private readonly db: DatabaseService,
    @Optional() private readonly redis?: RedisService,
  ) {}
  @Get('ready')
  @ApiOperation({
    summary: 'Comprobar disponibilidad del servicio y sus dependencias',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      required: ['status'],
      properties: { status: { type: 'string', enum: ['ok'], example: 'ok' } },
    },
  })
  async ready() {
    try {
      await this.db.ping();
      if (this.redis) await this.redis.readiness();
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Service dependencies unavailable');
    }
  }
}

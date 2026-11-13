import {
  Body,
  Controller,
  Get,
  HttpCode,
  Module,
  Post,
  Query,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Matches } from 'class-validator';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { executiveDashboardSchema } from '../modules/analytics/analytics.openapi';
import { RuntimeModule } from '../common/runtime.module';
import { DatabaseModule } from '../infrastructure/database/database.module';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { AnalyticsService } from '../modules/analytics/analytics.service';
import { DashboardQuery, VisitDto } from '../modules/analytics/analytics.dto';
import { InternalServiceGuard } from './internal-security';
import { ServiceHealthController } from './service-health.controller';

class InternalVisitDto extends VisitDto {
  @ApiProperty({
    minLength: 64,
    maxLength: 64,
    pattern: '^[a-f0-9]{64}$',
    example: '0'.repeat(64),
    description:
      'Hash SHA-256 del identificador de visitante; ejemplo ficticio, no es una credencial.',
  })
  @Matches(/^[a-f0-9]{64}$/)
  visitor!: string;
}

@Controller('analytics')
@ApiTags('Analítica interna')
class InternalAnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}
  @Get('dashboard')
  @ApiOperation({
    summary: 'Obtener indicadores ejecutivos',
    description:
      'Acceso interno de confianza. El acceso de usuarios se realiza mediante la API principal, que verifica permisos administrativos.',
  })
  @ApiOkResponse({ schema: executiveDashboardSchema })
  dashboard(@Query() query: DashboardQuery) {
    return this.analytics.dashboard(Number(query.days));
  }
  @Post('visit')
  @ApiOperation({
    summary: 'Registrar una visita',
    description:
      'Modifica datos reales. Usar datos de ejemplo solo en una base de demostración. La API principal aplica consentimiento y permisos antes de delegar.',
  })
  @ApiNoContentResponse({
    description:
      'Petición procesada; una visita puede omitirse por límites o por no existir un curso publicado.',
  })
  @HttpCode(204)
  visit(@Body() dto: InternalVisitDto) {
    return this.analytics.visit(dto.visitor, dto.path);
  }
}

@Module({
  imports: [RuntimeModule, DatabaseModule, RedisModule],
  controllers: [InternalAnalyticsController, ServiceHealthController],
  providers: [
    AnalyticsService,
    { provide: APP_GUARD, useClass: InternalServiceGuard },
  ],
})
export class AnalyticsServiceModule {}

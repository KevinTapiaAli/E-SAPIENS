import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RuntimeModule } from '../common/runtime.module';
import { DatabaseModule } from '../infrastructure/database/database.module';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { AcademicModule } from '../modules/academic/academic.module';
import { InternalServiceGuard } from './internal-security';
import { ServiceHealthController } from './service-health.controller';
import { ServiceDocumentController } from './service-document.controller';

@Module({
  imports: [RuntimeModule, DatabaseModule, RedisModule, AcademicModule],
  controllers: [ServiceHealthController, ServiceDocumentController],
  providers: [{ provide: APP_GUARD, useClass: InternalServiceGuard }],
})
export class AcademicServiceModule {}

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RuntimeModule } from '../common/runtime.module';
import { DatabaseModule } from '../infrastructure/database/database.module';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { IdentityModule } from '../modules/identity/identity.module';
import { InternalServiceGuard } from './internal-security';
import { ServiceHealthController } from './service-health.controller';
import { ServiceDocumentController } from './service-document.controller';

@Module({
  imports: [RuntimeModule, DatabaseModule, RedisModule, IdentityModule],
  controllers: [ServiceHealthController, ServiceDocumentController],
  providers: [{ provide: APP_GUARD, useClass: InternalServiceGuard }],
})
export class IdentityServiceModule {}

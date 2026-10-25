import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RuntimeModule } from '../common/runtime.module';
import { DatabaseModule } from '../infrastructure/database/database.module';
import { CatalogModule } from '../modules/catalog/catalog.module';
import { LibraryModule } from '../modules/library/library.module';
import { InternalServiceGuard } from './internal-security';
import { ServiceHealthController } from './service-health.controller';

@Module({
  imports: [RuntimeModule, DatabaseModule, CatalogModule, LibraryModule],
  controllers: [ServiceHealthController],
  providers: [{ provide: APP_GUARD, useClass: InternalServiceGuard }],
})
export class ContentServiceModule {}

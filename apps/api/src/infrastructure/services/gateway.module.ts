import { Global, Module } from '@nestjs/common';
import { CatalogController } from '../../modules/catalog/catalog.controller';
import { CatalogService } from '../../modules/catalog/catalog.service';
import { LibraryController } from '../../modules/library/library.controller';
import { LibraryService } from '../../modules/library/library.service';
import { AnalyticsController } from '../../modules/analytics/analytics.controller';
import { AnalyticsService } from '../../modules/analytics/analytics.service';
import { RedisModule } from '../redis/redis.module';
import { IdentityService } from '../../modules/identity/identity.service';
import { IdentitySecurityService } from '../../modules/identity/identity-security.service';
import { RemoteIdentityService } from './remote-identity';
import { DomainProxyController } from './domain-proxy.controller';
import { ServiceClient } from './service-client';
import {
  RemoteAnalyticsService,
  RemoteCatalogService,
  RemoteLibraryService,
} from './remote-services';

@Global()
@Module({
  imports: [RedisModule],
  controllers: [
    CatalogController,
    LibraryController,
    AnalyticsController,
    DomainProxyController,
  ],
  providers: [
    ServiceClient,
    IdentitySecurityService,
    { provide: IdentityService, useClass: RemoteIdentityService },
    { provide: CatalogService, useClass: RemoteCatalogService },
    { provide: LibraryService, useClass: RemoteLibraryService },
    { provide: AnalyticsService, useClass: RemoteAnalyticsService },
  ],
  exports: [ServiceClient],
})
export class GatewayModule {}

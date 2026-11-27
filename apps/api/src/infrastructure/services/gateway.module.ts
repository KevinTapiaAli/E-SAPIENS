import { DataCenterController } from '../../modules/analytics/data-center.controller';
import { DataCenterService } from '../../modules/analytics/data-center.service';
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
  RemoteDataCenterService,
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
    DataCenterController,
  ],
  providers: [
    ServiceClient,
    IdentitySecurityService,
    { provide: IdentityService, useClass: RemoteIdentityService },
    { provide: DataCenterService, useClass: RemoteDataCenterService },
    { provide: CatalogService, useClass: RemoteCatalogService },
    { provide: LibraryService, useClass: RemoteLibraryService },
    { provide: AnalyticsService, useClass: RemoteAnalyticsService },
  ],
  exports: [ServiceClient],
})
export class GatewayModule {}

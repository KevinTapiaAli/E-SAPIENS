import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../app.module';
import { DatabaseService } from '../infrastructure/database/database.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { CatalogService } from '../modules/catalog/catalog.service';
import { AnalyticsService } from '../modules/analytics/analytics.service';
import {
  RemoteCatalogService,
  RemoteAnalyticsService,
} from '../infrastructure/services/remote-services';
import { ContentServiceModule } from './content.module';
import { AnalyticsServiceModule } from './analytics.module';

describe('Independent service composition (no database or HTTP listeners)', () => {
  it.each([AppModule, ContentServiceModule, AnalyticsServiceModule])(
    'resolves %p with isolated infrastructure',
    async (root) => {
      const module = await Test.createTestingModule({ imports: [root] })
        .overrideProvider(DatabaseService)
        .useValue({})
        .overrideProvider(RedisService)
        .useValue({})
        .overrideProvider(ConfigService)
        .useValue(
          new ConfigService({
            APP_URL: 'http://localhost:3000',
            NODE_ENV: 'test',
            INTERNAL_SERVICE_TOKEN: 'a'.repeat(64),
          }),
        )
        .compile();
      try {
        if (root === AppModule) {
          expect(module.get(CatalogService)).toBeInstanceOf(
            RemoteCatalogService,
          );
          expect(module.get(AnalyticsService)).toBeInstanceOf(
            RemoteAnalyticsService,
          );
        } else if (root === ContentServiceModule) {
          expect(module.get(CatalogService)).toBeInstanceOf(CatalogService);
          expect(() => module.get(AnalyticsService)).toThrow();
        } else {
          expect(module.get(AnalyticsService)).toBeInstanceOf(AnalyticsService);
          expect(() => module.get(CatalogService)).toThrow();
        }
      } finally {
        await module.close();
      }
    },
  );
});

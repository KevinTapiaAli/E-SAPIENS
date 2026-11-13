import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../infrastructure/database/database.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { configureHttp } from '../common/http/configure-http';
import { ContentServiceModule } from './content.module';
import { AnalyticsServiceModule } from './analytics.module';
import { createServiceDocument } from './swagger';
import { IdentityServiceModule } from './identity.module';
import { AcademicServiceModule } from './academic.module';

describe('Service OpenAPI documents without network listeners', () => {
  it.each([
    ['content', ContentServiceModule],
    ['analytics', AnalyticsServiceModule],
    ['identity', IdentityServiceModule],
    ['academic', AcademicServiceModule],
  ] as const)(
    'documents %s with internal authentication and actual schemas',
    async (name, root) => {
      const secret = 'private-test-key-'.repeat(4);
      const module = await Test.createTestingModule({ imports: [root] })
        .overrideProvider(DatabaseService)
        .useValue({})
        .overrideProvider(RedisService)
        .useValue({})
        .overrideProvider(ConfigService)
        .useValue(
          new ConfigService({
            NODE_ENV: 'test',
            APP_URL: 'http://localhost:3000',
            INTERNAL_SERVICE_TOKEN: secret,
          }),
        )
        .compile();
      const app = module.createNestApplication();
      try {
        configureHttp(app);
        const document = createServiceDocument(app, name);
        expect(document.security).toEqual([{ 'internal-service': [] }]);
        expect(
          document.components?.securitySchemes?.['internal-service'],
        ).toMatchObject({
          type: 'apiKey',
          in: 'header',
          name: 'x-internal-service-token',
        });
        expect(JSON.stringify(document)).not.toContain(secret);
        expect(
          document.paths['/api/v1/health/ready'].get?.responses['401'],
        ).toBeDefined();
        if (name === 'content') {
          expect(
            document.paths['/api/v1/courses'].get?.responses['200'],
          ).toBeDefined();
          expect(document.paths['/api/v1/library/{id}'].get).toBeDefined();
        } else if (name === 'analytics') {
          expect(
            document.paths['/api/v1/analytics/dashboard'].get?.responses['200'],
          ).toBeDefined();
          expect(
            document.paths['/api/v1/analytics/visit'].post?.requestBody,
          ).toBeDefined();
          expect(document.components?.schemas?.InternalVisitDto).toMatchObject({
            required: expect.arrayContaining(['visitor', 'path']),
          });
        } else {
          const path =
            name === 'identity'
              ? '/api/v1/identity/me'
              : '/api/v1/academic/courses';
          expect(document.paths[path].get?.security).toEqual([
            { cookie: [], 'internal-service': [] },
          ]);
          expect(document.paths['/api/v1/internal/openapi']).toBeUndefined();
        }
      } finally {
        await app.close();
      }
    },
  );
});

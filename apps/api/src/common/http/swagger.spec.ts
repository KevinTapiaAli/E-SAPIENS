import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../app.module';
import { IdentityModule } from '../../modules/identity/identity.module';
import { AcademicModule } from '../../modules/academic/academic.module';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { configureHttp } from './configure-http';
import { createApiDocument, mergeApiDocuments } from './swagger';

describe('Public API OpenAPI (without listeners or database connections)', () => {
  it('documents real session authentication, protected routes and request schemas without exposing credentials', async () => {
    const token = 'secret-internal-key-'.repeat(4);
    const module = await Test.createTestingModule({
      imports: [AppModule, IdentityModule, AcademicModule],
    })
      .overrideProvider(DatabaseService)
      .useValue({})
      .overrideProvider(RedisService)
      .useValue({})
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          APP_URL: 'http://localhost:3000',
          NODE_ENV: 'test',
          SWAGGER_ORIGIN: 'http://localhost:4000',
          INTERNAL_SERVICE_TOKEN: token,
        }),
      )
      .compile();
    const app = module.createNestApplication();
    try {
      configureHttp(app);
      const document = createApiDocument(app);
      const merged = mergeApiDocuments({ ...document, paths: {} }, [document]);
      expect(merged.paths['/api/v1/identity/login']).toEqual(
        document.paths['/api/v1/identity/login'],
      );
      expect(merged.paths['/api/v1/academic/courses']).toEqual(
        document.paths['/api/v1/academic/courses'],
      );
      expect(merged.paths['/api/v1/health']).toBeUndefined();
      expect(merged.components?.securitySchemes).toEqual(
        document.components?.securitySchemes,
      );
      expect(document.components?.securitySchemes?.cookie).toMatchObject({
        type: 'apiKey',
        in: 'cookie',
        name: 'esapiens_session',
      });
      expect(JSON.stringify(document)).not.toContain(token);
      expect(
        document.paths['/api/v1/identity/login'].post?.requestBody,
      ).toBeDefined();
      expect(
        document.paths['/api/v1/identity/me'].get?.responses['200'],
      ).toMatchObject({
        content: {
          'application/json': {
            schema: {
              required: expect.arrayContaining([
                'roles',
                'permissions',
                'email',
              ]),
            },
          },
        },
      });
      const missingParameters: string[] = [];
      for (const [path, item] of Object.entries(document.paths)) {
        for (const method of ['get', 'post'] as const) {
          const operation = item[method];
          if (operation) {
            for (const match of path.matchAll(/\{([^}]+)\}/g)) {
              if (
                !operation.parameters?.some(
                  (parameter) =>
                    'name' in parameter &&
                    parameter.name === match[1] &&
                    parameter.in === 'path' &&
                    parameter.required,
                )
              )
                missingParameters.push(`${method} ${path}: ${match[1]}`);
            }
          }
          if (
            operation &&
            (path.startsWith('/api/v1/academic/') ||
              /^\/api\/v1\/identity\/(me|dashboard|pending|accounts|avatar)(\/|$)/.test(
                path,
              ) ||
              path === '/api/v1/analytics/dashboard')
          ) {
            expect(operation.security).toContainEqual({ cookie: [] });
            expect(operation.responses['401']).toBeDefined();
            expect(operation.responses['403']).toBeDefined();
          }
        }
      }
      expect(missingParameters).toEqual([]);
      expect(document.components?.schemas?.ReminderDto).toMatchObject({
        required: expect.arrayContaining(['operationId', 'title', 'day']),
      });
      expect(document.components?.schemas?.LoginDto).toMatchObject({
        properties: { password: { writeOnly: true } },
      });
      for (const [name, fields] of Object.entries({
        TaskDto: [
          'moduleId',
          'title',
          'instructions',
          'dueAt',
          'allowLate',
          'maxSubmissions',
          'published',
        ],
        MaterialDto: [
          'moduleId',
          'title',
          'kind',
          'content',
          'url',
          'published',
        ],
        GradeSubmissionDto: ['grade', 'expectedGrade', 'reason'],
        SubmitTaskDto: ['operationId', 'text', 'comment', 'url'],
        TaskFeedbackDto: ['operationId', 'comment'],
        CreateOrderDto: ['planId', 'operationId'],
        ReportPaymentDto: ['method', 'reference'],
        ReviewPaymentDto: ['decision', 'reason'],
        CreatePlanDto: ['courseId', 'name', 'price', 'currency', 'days'],
        CreateEvaluationDto: [
          'moduleId',
          'title',
          'minutes',
          'attempts',
          'passingScore',
          'questions',
        ],
        SubmitEvaluationDto: ['answers'],
        SaveLibraryDto: ['saved'],
        TeacherProfileReviewDto: [
          'specialty',
          'curriculumUrl',
          'qualificationReview',
          'revision',
        ],
      })) {
        expect(document.components?.schemas?.[name]).toMatchObject({
          required: expect.arrayContaining(fields),
        });
      }
      expect(document.paths['/api/v1/courses'].get?.security).toBeUndefined();
    } finally {
      await app.close();
    }
  });
});

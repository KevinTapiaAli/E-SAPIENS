import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';
import { ServiceClient } from '../../infrastructure/services/service-client';
import { IdentitySecurityService } from '../../modules/identity/identity-security.service';

export function createApiDocument(app: INestApplication) {
  const security = app.get(IdentitySecurityService);
  const config = new DocumentBuilder()
    .setTitle('E-SAPIENS API')
    .setDescription(
      'API REST de identidad, gestión académica, catálogo, biblioteca y analítica. ' +
        'Los ejemplos son ilustrativos; Execute consulta o modifica la base de datos real. ' +
        'Crea cuentas aprobadas con account:create. La autenticación usa una cookie HttpOnly de ocho horas, no Bearer. ' +
        (security.swaggerOrigin
          ? `En desarrollo abre Swagger desde ${security.swaggerOrigin}/api/docs y ejecuta POST /api/v1/identity/login con tus credenciales. `
          : 'Inicia sesión desde la web en el mismo navegador y host. Las escrituras requieren el origen APP_URL; Swagger local puede autorizarse con SWAGGER_ORIGIN. ') +
        'El navegador envía la cookie automáticamente; no la pegues en Authorize. ' +
        'Comprueba GET /api/v1/identity/me y cierra sesión con POST /api/v1/identity/logout. ' +
        'Los permisos, el estado de la cuenta y el acceso al recurso se comprueban en cada operación.',
    )
    .setVersion('1.0')
    .addCookieAuth(security.cookieName)
    .build();
  const document = SwaggerModule.createDocument(app, config);
  for (const path of Object.values(document.paths)) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      const operation = path[method];
      if (!operation) continue;
      if (operation.security?.some((scheme) => 'cookie' in scheme)) {
        operation.responses['401'] ??= {
          description: 'Sesión ausente, vencida o revocada.',
        };
        operation.responses['403'] ??= {
          description:
            'Rol, permiso, estado o acceso al recurso no autorizado.',
        };
      }
      if (method !== 'get') {
        operation.responses['400'] ??= {
          description: 'Parámetros o cuerpo inválidos.',
        };
        operation.responses['403'] ??= {
          description: 'Origen o acceso no autorizado.',
        };
      }
      operation.responses['503'] ??= {
        description:
          'Una dependencia no está disponible. No se omiten controles de seguridad.',
      };
    }
  }
  return document;
}

export function mergeApiDocuments(
  base: OpenAPIObject,
  documents: OpenAPIObject[],
) {
  const result: OpenAPIObject = structuredClone(base);
  for (const document of documents) {
    for (const [path, item] of Object.entries(document.paths)) {
      if (/^\/api\/v1\/(identity|academic)(\/|$)/.test(path))
        result.paths[path] = item;
    }
    result.components = {
      ...result.components,
      schemas: {
        ...result.components?.schemas,
        ...document.components?.schemas,
      },
    };
  }
  return result;
}

export function setupApiSwagger(app: INestApplication) {
  const base = createApiDocument(app);
  let cached: { until: number; document: OpenAPIObject } | undefined;
  app.getHttpAdapter().get('/api/docs-json', async (_req, res) => {
    try {
      if (!cached || cached.until < Date.now()) {
        const client = app.get(ServiceClient);
        const documents = await Promise.all(
          (['identity', 'academic'] as const).map((service) =>
            client.request<OpenAPIObject>(service, 'internal/openapi'),
          ),
        );
        cached = {
          until: Date.now() + 60000,
          document: mergeApiDocuments(base, documents),
        };
      }
      res.setHeader('Cache-Control', 'no-store');
      res.json(cached.document);
    } catch {
      res.status(503).json({
        error: {
          code: 'OPENAPI_UNAVAILABLE',
          message:
            'Inicia los servicios de identidad y académico para consultar la documentación completa.',
        },
      });
    }
  });
  SwaggerModule.setup('api/docs', app, base, {
    raw: false,
    swaggerOptions: {
      // Do not embed the gateway-only schema; load the aggregated document.
      spec: null,
      url: '/api/docs-json',
      persistAuthorization: false,
      withCredentials: true,
      displayRequestDuration: true,
      validatorUrl: null,
    },
  });
}

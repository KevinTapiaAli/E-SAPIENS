import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger';

const errorSchema: SchemaObject = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'UNAUTHORIZED' },
        message: {
          type: 'string',
          example: 'Internal service authentication required',
        },
        details: { type: 'object', additionalProperties: true },
        requestId: { type: 'string' },
      },
    },
  },
};

export function createServiceDocument(app: INestApplication, name: string) {
  const config = new DocumentBuilder()
    .setTitle(
      `E-SAPIENS · ${name === 'content' ? 'Contenido público' : 'Analítica'}`,
    )
    .setDescription(
      'Servicio interno. En Authorize introduce INTERNAL_SERVICE_TOKEN de tu .env, sin prefijo Bearer. Los ejemplos son ficticios; Execute realiza operaciones reales. La clave no se incluye en esta documentación.',
    )
    .setVersion('1.0')
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'x-internal-service-token' },
      'internal-service',
    )
    .addSecurityRequirements('internal-service')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  for (const path of Object.values(document.paths)) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      const operation = path[method];
      if (!operation) continue;
      operation.responses['401'] ??= {
        description: 'Clave interna ausente o incorrecta.',
        content: { 'application/json': { schema: errorSchema } },
      };
      operation.responses['503'] ??= {
        description: 'Dependencias del servicio no disponibles.',
        content: { 'application/json': { schema: errorSchema } },
      };
    }
  }
  return document;
}

export function setupServiceSwagger(app: INestApplication, name: string) {
  SwaggerModule.setup('api/docs', app, createServiceDocument(app, name), {
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions: {
      persistAuthorization: false,
      displayRequestDuration: true,
    },
  });
}

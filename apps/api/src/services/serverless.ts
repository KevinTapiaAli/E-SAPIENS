import type { INestApplication, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Logger } from 'nestjs-pino';
import { configureHttp } from '../common/http/configure-http';
import { createApiDocument, setupApiSwagger } from '../common/http/swagger';
import { ServiceDocumentController } from './service-document.controller';

/** Reuse one initialized Nest application per function instance. */
export function createServerlessHandler(module: Type<unknown>, name: string) {
  let application: Promise<INestApplication> | undefined;
  async function initialize() {
    const app = await NestFactory.create(module, {
      bufferLogs: true,
      abortOnError: false,
    });
    try {
      app.useLogger(app.get(Logger));
      configureHttp(app);
      if (name === 'gateway') setupApiSwagger(app);
      if (name === 'identity' || name === 'academic') {
        app.get(ServiceDocumentController).document = createApiDocument(app);
      }
      await app.init();
      return app;
    } catch (error) {
      await app.close();
      throw error;
    }
  }
  return async (request: IncomingMessage, response: ServerResponse) => {
    application ??= initialize().catch(() => {
      application = undefined;
      // Never expose connection strings or bootstrap internals to clients/logs.
      throw new Error('SERVICE_INITIALIZATION_FAILED');
    });
    const app = await application;
    app.getHttpAdapter().getInstance()(request, response);
  };
}

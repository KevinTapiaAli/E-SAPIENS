import type { Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { configureHttp } from '../common/http/configure-http';
import { setupServiceSwagger } from './swagger';

export async function startService(
  module: Type<unknown>,
  name: string,
  defaultPort: number,
) {
  const app = await NestFactory.create(module, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  configureHttp(app);
  app.enableShutdownHooks();
  const config = app.get(ConfigService);
  const port = Number(
    config.get(`${name.toUpperCase()}_SERVICE_PORT`) ?? defaultPort,
  );
  const host = config.get<string>('SERVICE_BIND_HOST') ?? '127.0.0.1';
  if (config.get<string>('NODE_ENV') !== 'production') {
    setupServiceSwagger(app, name);
  }
  await app.listen(port, host);
  app.get(Logger).log(`${name} service ready on ${host}:${port}`);
  if (config.get<string>('NODE_ENV') !== 'production') {
    app
      .get(Logger)
      .log(`Swagger ${name}: http://127.0.0.1:${port}/api/docs (acceso local)`);
  }
}

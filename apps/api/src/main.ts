import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureHttp } from './common/http/configure-http';
import { setupApiSwagger } from './common/http/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  configureHttp(app);
  app.enableShutdownHooks();

  setupApiSwagger(app);

  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);

  await app.listen(port);

  console.log(`E-SAPIENS API running on http://localhost:${port}/api/v1`);
  console.log(`Swagger available on http://localhost:${port}/api/docs`);
}

void bootstrap();

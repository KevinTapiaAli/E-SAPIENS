import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureHttp } from './common/http/configure-http';
import { IdentitySecurityService } from './modules/identity/identity-security.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  configureHttp(app);
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('E-SAPIENS API')
    .setDescription('API REST oficial de la plataforma E-SAPIENS LMS')
    .setVersion('1.0')
    .addCookieAuth(app.get(IdentitySecurityService).cookieName)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.PORT ?? 4000);

  await app.listen(port);

  console.log(`E-SAPIENS API running on http://localhost:${port}/api/v1`);
  console.log(`Swagger available on http://localhost:${port}/api/docs`);
}

void bootstrap();

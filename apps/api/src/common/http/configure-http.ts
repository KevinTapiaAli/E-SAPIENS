import { INestApplication, ValidationPipe } from '@nestjs/common';

/** Compartida por el servidor y los tests E2E para validar del mismo modo. */
export function configureHttp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}

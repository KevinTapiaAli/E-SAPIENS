import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { IdentitySecurityService } from './identity-security.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

describe('Política de seguridad de identidad', () => {
  const redis = { consume: jest.fn() } as unknown as RedisService;
  const config = (url: string, environment = 'development') =>
    new ConfigService({
      APP_URL: url,
      NODE_ENV: environment,
      SWAGGER_ORIGIN: '',
    });
  const request = (origin?: string, site = 'same-origin') =>
    ({ headers: { origin, 'sec-fetch-site': site } }) as Request;

  it('permite solo el origen local explícito de Swagger y conserva la comprobación de sitio', () => {
    const security = new IdentitySecurityService(
      new ConfigService({
        APP_URL: 'http://localhost:3000',
        NODE_ENV: 'development',
        SWAGGER_ORIGIN: 'http://localhost:4000',
      }),
      redis,
    );
    expect(() =>
      security.checkOrigin(request('http://localhost:4000')),
    ).not.toThrow();
    expect(() =>
      security.checkOrigin(request('http://localhost:3000')),
    ).not.toThrow();
    for (const origin of [
      undefined,
      'null',
      'http://evil.example',
      'http://localhost:4001',
      'http://localhost:4000.evil.example',
    ]) {
      expect(() => security.checkOrigin(request(origin))).toThrow();
    }
    expect(() =>
      security.checkOrigin(request('http://localhost:4000', 'cross-site')),
    ).toThrow();
    expect(() =>
      security.checkOrigin(request('http://localhost:4000', 'same-site')),
    ).toThrow();
  });

  it('no habilita el origen de Swagger por defecto ni en producción', () => {
    const local = new IdentitySecurityService(
      config('http://localhost:3000'),
      redis,
    );
    expect(() => local.checkOrigin(request('http://localhost:4000'))).toThrow();
    const production = new IdentitySecurityService(
      new ConfigService({
        APP_URL: 'https://esapiens.example',
        NODE_ENV: 'production',
        SWAGGER_ORIGIN: 'https://localhost:4000',
      }),
      redis,
    );
    expect(production.swaggerOrigin).toBeUndefined();
    expect(() =>
      production.checkOrigin(request('https://localhost:4000')),
    ).toThrow();
    expect(() =>
      production.checkOrigin(request('https://esapiens.example')),
    ).not.toThrow();
  });

  it.each([
    'http://external.example',
    'http://localhost:4000/path',
    'http://user:password@localhost:4000',
    'http://localhost:4000/',
    'https://localhost:4000',
    'invalid',
  ])(
    'rechaza un origen de Swagger inválido sin incluir su valor en el error',
    (origin) => {
      expect(
        () =>
          new IdentitySecurityService(
            new ConfigService({
              APP_URL: 'http://localhost:3000',
              NODE_ENV: 'development',
              SWAGGER_ORIGIN: origin,
            }),
            redis,
          ),
      ).toThrow(/^SWAGGER_ORIGIN must be a local/);
    },
  );
  it('rechaza producción sin HTTPS y dominios externos HTTP', () => {
    expect(
      () =>
        new IdentitySecurityService(
          config('http://localhost:3000', 'production'),
          redis,
        ),
    ).toThrow();
    expect(
      () =>
        new IdentitySecurityService(config('http://esapiens.example'), redis),
    ).toThrow();
  });
  it('usa cookie host-only Secure en HTTPS y borra con los mismos atributos', () => {
    const security = new IdentitySecurityService(
      config('https://esapiens.example', 'production'),
      redis,
    );
    const cookie = jest.fn();
    const clearCookie = jest.fn();
    const response = { cookie, clearCookie } as unknown as Response;
    security.setCookie(response, 'token');
    security.clearCookie(response);
    expect(cookie).toHaveBeenCalledWith('__Host-esapiens_session', 'token', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 28800000,
    });
    expect(clearCookie).toHaveBeenCalledWith('__Host-esapiens_session', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
  });
  it('no permite login cuando Redis no puede aplicar los límites', async () => {
    const security = new IdentitySecurityService(
      config('http://localhost:3000'),
      {
        consume: () => Promise.reject(new Error('offline')),
      } as unknown as RedisService,
    );
    await expect(
      security.limit(
        { ip: '127.0.0.1' } as Request,
        'login',
        'test@example.test',
      ),
    ).rejects.toMatchObject({ status: 503 });
  });
});

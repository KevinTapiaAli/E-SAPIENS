import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { IdentitySecurityService } from './identity-security.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

describe('Política de seguridad de identidad', () => {
  const redis = { consume: jest.fn() } as unknown as RedisService;
  const config = (url: string, environment = 'development') =>
    new ConfigService({ APP_URL: url, NODE_ENV: environment });
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

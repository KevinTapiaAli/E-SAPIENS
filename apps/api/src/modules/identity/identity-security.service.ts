import { createHash } from 'node:crypto';
import {
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { RedisService } from '../../infrastructure/redis/redis.service';

export const tokenDigest = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class IdentitySecurityService {
  private readonly logger = new Logger(IdentitySecurityService.name);
  private lastFailureLog = 0;
  readonly origin: string;
  readonly secure: boolean;
  readonly cookieName: string;

  constructor(
    config: ConfigService,
    private readonly redis: RedisService,
  ) {
    const appUrl = config.get<string>('APP_URL');
    if (!appUrl) throw new Error('APP_URL is required for web identity');
    const url = new URL(appUrl);
    this.origin = url.origin;
    this.secure = url.protocol === 'https:';
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      (!this.secure &&
        !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) ||
      (config.get('NODE_ENV') === 'production' && !this.secure)
    ) {
      throw new Error('APP_URL must use HTTPS outside local development');
    }
    this.cookieName = this.secure
      ? '__Host-esapiens_session'
      : 'esapiens_session';
  }

  checkOrigin(request: Request): void {
    if (
      request.headers.origin !== this.origin ||
      (request.headers['sec-fetch-site'] &&
        request.headers['sec-fetch-site'] !== 'same-origin')
    ) {
      throw new ForbiddenException({
        code: 'ORIGIN_NOT_ALLOWED',
        message: 'Origen de la solicitud no permitido.',
      });
    }
  }

  token(request: Request): string | undefined {
    const value = request.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${this.cookieName}=`))
      ?.slice(this.cookieName.length + 1);
    return value && /^[a-f0-9]{64}$/.test(value) ? value : undefined;
  }

  setCookie(response: Response, token: string): void {
    response.cookie(this.cookieName, token, {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 3600 * 1000,
    });
  }

  clearCookie(response: Response): void {
    response.clearCookie(this.cookieName, {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'lax',
      path: '/',
    });
  }

  async limit(
    request: Request,
    purpose: 'login' | 'register',
    email: string,
  ): Promise<void> {
    let accountCount: number;
    let addressCount: number;
    try {
      [accountCount, addressCount] = await Promise.all([
        this.redis.consume(
          `identity:${purpose}:account:${tokenDigest(email)}`,
          900,
        ),
        this.redis.consume(
          `identity:${purpose}:address:${tokenDigest(request.ip ?? 'unknown')}`,
          900,
        ),
      ]);
    } catch (error: unknown) {
      if (Date.now() - this.lastFailureLog > 30000) {
        this.lastFailureLog = Date.now();
        const message = error instanceof Error ? error.message : '';
        const reason =
          ['MISCONF', 'NOPERM', 'READONLY', 'NOAUTH', 'OOM'].find((code) =>
            message.startsWith(code),
          ) ?? 'CONNECTION_OR_TIMEOUT';
        this.logger.error(
          `IDENTITY_UNAVAILABLE: Redis no pudo aplicar el límite de acceso (${reason}).`,
        );
      }
      throw new ServiceUnavailableException({
        code: 'IDENTITY_UNAVAILABLE',
        message:
          'El servicio de inicio de sesión no está disponible. Intenta de nuevo en unos momentos; si continúa, avisa a la administración.',
      });
    }
    if (
      accountCount > (purpose === 'login' ? 10 : 3) ||
      addressCount > (purpose === 'login' ? 100 : 30)
    ) {
      throw new HttpException(
        {
          code: 'AUTH_RATE_LIMITED',
          message:
            'Demasiados intentos. Espera 15 minutos antes de intentar nuevamente.',
        },
        429,
      );
    }
  }
}

import { timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class InternalServiceGuard implements CanActivate {
  private readonly token: Buffer;
  constructor(config: ConfigService) {
    const secret = config.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!secret || secret.length < 32)
      throw new Error(
        'INTERNAL_SERVICE_TOKEN must contain at least 32 characters',
      );
    this.token = Buffer.from(secret);
  }
  canActivate(context: ExecutionContext): boolean {
    const value = context.switchToHttp().getRequest<Request>().headers[
      'x-internal-service-token'
    ];
    const candidate = Buffer.from(typeof value === 'string' ? value : '');
    if (
      candidate.length !== this.token.length ||
      !timingSafeEqual(candidate, this.token)
    ) {
      throw new UnauthorizedException(
        'Internal service authentication required',
      );
    }
    return true;
  }
}

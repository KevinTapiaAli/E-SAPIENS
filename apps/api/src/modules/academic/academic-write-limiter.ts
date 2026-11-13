import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { RedisService } from '../../infrastructure/redis/redis.service';

@Injectable()
export class AcademicWriteLimiter {
  constructor(private readonly redis: RedisService) {}
  async check(userId: string) {
    let count: number;
    try {
      count = await this.redis.consume(`academic:write:${userId}`, 60);
    } catch {
      throw new ServiceUnavailableException(
        'No se pudo verificar el límite de operaciones. Intenta nuevamente.',
      );
    }
    if (count > 30)
      throw new HttpException(
        'Demasiadas operaciones. Espera un minuto antes de continuar.',
        429,
      );
  }
}

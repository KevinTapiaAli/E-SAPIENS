import { randomUUID } from 'node:crypto';
import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);
  private unavailable = false;
  private readyPromise?: Promise<void>;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      throw new Error('REDIS_URL is not configured');
    }

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      commandTimeout: 3000,
      enableOfflineQueue: false,
      retryStrategy: (attempt) => Math.min(attempt * 500, 5000),
    });
    this.client.on('error', () => {
      if (!this.unavailable)
        this.logger.error(
          'REDIS_UNAVAILABLE: no se puede conectar con el servicio de protección del acceso. Revisa que Redis esté iniciado y REDIS_URL sea correcta.',
        );
      this.unavailable = true;
    });
    this.client.on('ready', () => {
      if (this.unavailable) this.logger.log('Conexión con Redis restablecida.');
      this.unavailable = false;
    });
  }

  async ping(): Promise<string> {
    await this.waitUntilReady();
    return this.client.ping();
  }

  private waitUntilReady(): Promise<void> {
    if (this.client.status === 'ready') return Promise.resolve();
    this.readyPromise ??= new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeout);
        this.client.off('ready', ready);
        this.client.off('end', ended);
      };
      const ready = () => {
        cleanup();
        resolve();
      };
      const ended = () => {
        cleanup();
        reject(new Error('REDIS_UNAVAILABLE'));
      };
      const timeout = setTimeout(ended, 3000);
      this.client.once('ready', ready);
      this.client.once('end', ended);
    }).finally(() => {
      this.readyPromise = undefined;
    });
    return this.readyPromise;
  }

  /** La autenticación necesita ejecutar scripts y escribir, además de PING. */
  async readiness(): Promise<string> {
    const result = await this.consume(`health:identity:${randomUUID()}`, 5);
    if (result !== 1) throw new Error('REDIS_WRITE_UNAVAILABLE');
    return 'PONG';
  }

  /** Fixed window; INCR and expiry must be atomic across API instances. */
  async consume(key: string, seconds: number): Promise<number> {
    await this.waitUntilReady();
    return Number(
      await this.client.eval(
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
        1,
        key,
        seconds,
      ),
    );
  }

  async onApplicationShutdown() {
    this.client.disconnect();
  }
}

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      throw new Error('REDIS_URL is not configured');
    }

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
    });
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async onApplicationShutdown() {
    await this.client.quit();
  }
}

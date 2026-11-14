import { EventEmitter } from 'node:events';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('Redis cold start', () => {
  let client: EventEmitter & { status: string; eval: jest.Mock };
  let service: RedisService;
  beforeEach(() => {
    jest.useFakeTimers();
    client = Object.assign(new EventEmitter(), {
      status: 'connecting',
      eval: jest.fn().mockResolvedValue(1),
    });
    (Redis as unknown as jest.Mock).mockImplementation(() => client);
    service = new RedisService(
      new ConfigService({ REDIS_URL: 'redis://localhost' }),
    );
  });
  afterEach(() => jest.useRealTimers());

  it('waits for Redis before enforcing concurrent rate limits', async () => {
    const first = service.consume('first', 5);
    const second = service.consume('second', 5);
    expect(client.eval).not.toHaveBeenCalled();
    expect(client.listenerCount('ready')).toBe(2); // Logger + shared wait.
    client.status = 'ready';
    client.emit('ready');
    await expect(Promise.all([first, second])).resolves.toEqual([1, 1]);
    expect(client.eval).toHaveBeenCalledTimes(2);
    expect(client.listenerCount('ready')).toBe(1);
  });

  it('fails closed when Redis never connects and allows later recovery', async () => {
    const attempt = expect(service.consume('blocked', 5)).rejects.toThrow(
      'REDIS_UNAVAILABLE',
    );
    await jest.advanceTimersByTimeAsync(3000);
    await attempt;
    expect(client.eval).not.toHaveBeenCalled();
    expect(client.listenerCount('end')).toBe(0);
    client.status = 'ready';
    await expect(service.consume('recovered', 5)).resolves.toBe(1);
  });
});

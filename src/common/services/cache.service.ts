import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class CacheService {
  constructor(@Inject('REDIS_CACHE') private client: RedisClientType) {}

  async sAdd(key: string, member: string): Promise<void> {
    await this.client.sAdd(key, member);
  }

  async sRem(key: string, member: string): Promise<void> {
    await this.client.sRem(key, member);
  }

  async sCard(key: string): Promise<number> {
    return this.client.sCard(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  async get<T>(key: string): Promise<T | null> {
    const val = await this.client.get(key);
    return val ? (JSON.parse(val) as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const val = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) await this.client.setEx(key, ttlSeconds, val);
    else await this.client.set(key, val);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    let cursor = 0;

    do {
      const scanResult = await this.client.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });

      cursor = scanResult.cursor;
      const keys = scanResult.keys;

      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } while (cursor !== 0);
  }
}

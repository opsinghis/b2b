import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis | null = null;
  private readonly defaultTtl: number;

  constructor(private readonly configService: ConfigService) {
    this.defaultTtl = this.configService.get<number>('CACHE_TTL', 300); // 5 minutes default
  }

  async onModuleInit(): Promise<void> {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 3) {
            this.logger.warn('Redis connection retries exhausted');
            return null;
          }
          return Math.min(times * 100, 3000);
        },
      });

      this.client.on('error', (err) => {
        this.logger.error(`Redis error: ${err.message}`);
      });

      this.client.on('connect', () => {
        this.logger.log('Redis connected');
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to initialize Redis: ${message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache get error for key ${key}: ${message}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      const ttl = ttlSeconds ?? this.defaultTtl;
      await this.client.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache set error for key ${key}: ${message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache delete error for key ${key}: ${message}`);
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache delete by pattern error: ${message}`);
    }
  }

  async getTtl(key: string): Promise<number> {
    if (!this.client) {
      return -1;
    }

    try {
      return await this.client.ttl(key);
    } catch {
      return -1;
    }
  }

  isConnected(): boolean {
    return this.client?.status === 'ready';
  }
}

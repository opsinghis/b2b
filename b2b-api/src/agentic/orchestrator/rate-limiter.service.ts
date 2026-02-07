import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly limits: Map<string, RateLimitEntry> = new Map();
  private readonly defaultLimit: number;
  private readonly windowMs: number;

  constructor(private readonly configService: ConfigService) {
    this.defaultLimit = this.configService.get<number>('AGENT_RATE_LIMIT', 100);
    this.windowMs = this.configService.get<number>('AGENT_RATE_WINDOW_MS', 60000); // 1 minute
  }

  async checkLimit(key: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now - entry.windowStart > this.windowMs) {
      // New window
      this.limits.set(key, { count: 1, windowStart: now });
      return {
        allowed: true,
        remaining: this.defaultLimit - 1,
        resetAt: new Date(now + this.windowMs),
      };
    }

    if (entry.count >= this.defaultLimit) {
      const resetAt = new Date(entry.windowStart + this.windowMs);
      this.logger.warn(`Rate limit exceeded for key: ${key}`);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: this.defaultLimit - entry.count,
      resetAt: new Date(entry.windowStart + this.windowMs),
    };
  }

  async getRemainingLimit(key: string): Promise<{ remaining: number; limit: number; resetAt: Date }> {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now - entry.windowStart > this.windowMs) {
      return {
        remaining: this.defaultLimit,
        limit: this.defaultLimit,
        resetAt: new Date(now + this.windowMs),
      };
    }

    return {
      remaining: Math.max(0, this.defaultLimit - entry.count),
      limit: this.defaultLimit,
      resetAt: new Date(entry.windowStart + this.windowMs),
    };
  }

  clearExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now - entry.windowStart > this.windowMs) {
        this.limits.delete(key);
      }
    }
  }

  getLimit(): number {
    return this.defaultLimit;
  }

  getWindowMs(): number {
    return this.windowMs;
  }
}

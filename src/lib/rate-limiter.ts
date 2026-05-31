import { Redis } from '@/lib/redis';
import { logger } from '@/lib/logger';

export class RateLimiter {
  private redis: Redis;
  private windowSeconds: number;
  private maxRequests: number;

  constructor(windowSeconds: number, maxRequests: number) {
    this.redis = new Redis();
    this.windowSeconds = windowSeconds;
    this.maxRequests = maxRequests;
  }

  async check(): Promise<{ allowed: boolean; remaining: number }> {
    const key = 'health_check_rate_limit';
    
    try {
      const multi = this.redis.multi();
      const now = Date.now();
      const windowStart = now - (this.windowSeconds * 1000);

      multi.zremrangebyscore(key, 0, windowStart);
      multi.zadd(key, now, now.toString());
      multi.zcard(key);
      multi.expire(key, this.windowSeconds);

      const results = await multi.exec();
      const requestCount = results[2] as number;

      const remaining = Math.max(0, this.maxRequests - requestCount);
      const allowed = requestCount <= this.maxRequests;

      return { allowed, remaining };
    } catch (error) {
      logger.error('Rate limiter check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Fail open if rate limiting fails
      return { allowed: true, remaining: 1 };
    }
  }
}
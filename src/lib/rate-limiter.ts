import { Redis } from 'ioredis';

interface RateLimiterOptions {
  windowMs: number;
  max: number;
}

export class RateLimiter {
  private redis: Redis;
  private options: RateLimiterOptions;

  constructor(options: RateLimiterOptions) {
    this.options = options;
    this.redis = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      connectTimeout: 1000
    });
  }

  async check(): Promise<{ allowed: boolean; remaining: number }> {
    try {
      const key = 'rate_limit:health_check';
      const now = Date.now();
      const windowStart = now - this.options.windowMs;

      // Remove old entries
      await this.redis.zremrangebyscore(key, 0, windowStart);

      // Count requests in current window
      const count = await this.redis.zcard(key);

      if (count >= this.options.max) {
        return { allowed: false, remaining: 0 };
      }

      // Add new request
      await this.redis.zadd(key, now.toString(), now.toString());
      await this.redis.expire(key, Math.ceil(this.options.windowMs / 1000));

      return {
        allowed: true,
        remaining: this.options.max - count - 1
      };
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open if Redis is down
      return { allowed: true, remaining: 1 };
    } finally {
      // Clean up Redis connection
      if (this.redis.status === 'ready') {
        await this.redis.quit();
      }
    }
  }
}

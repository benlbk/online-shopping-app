import Redis from 'ioredis';

interface RateLimiterOptions {
  windowMs: number;
  max: number;
}

export class RateLimiter {
  private redis: Redis;
  private options: RateLimiterOptions;

  constructor(options: RateLimiterOptions) {
    this.options = options;
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async check(ip: string): Promise<{allowed: boolean, remaining: number}> {
    const key = `ratelimit:${ip}`;
    const now = Date.now();
    const windowStart = now - this.options.windowMs;

    try {
      // Clean old requests
      await this.redis.zremrangebyscore(key, 0, windowStart);

      // Count requests in current window
      const requestCount = await this.redis.zcard(key);

      if (requestCount >= this.options.max) {
        return { allowed: false, remaining: 0 };
      }

      // Add new request
      await this.redis.zadd(key, now, now.toString());
      await this.redis.expire(key, Math.ceil(this.options.windowMs / 1000));

      return {
        allowed: true,
        remaining: this.options.max - requestCount - 1
      };

    } catch (error) {
      console.error('Rate limiter error:', error.message);
      // Fail open if Redis is down
      return { allowed: true, remaining: 1 };
    }
  }
}

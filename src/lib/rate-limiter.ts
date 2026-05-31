import { RedisClient } from './redis';

export class RateLimiter {
  private redis: RedisClient;
  private limit: number;
  private window: number;

  constructor(limit: number, windowInSeconds: number) {
    this.redis = new RedisClient();
    this.limit = limit;
    this.window = windowInSeconds;
  }

  async check(): Promise<{ allowed: boolean; remaining: number }> {
    try {
      const key = 'rate_limit:health';
      const current = await this.redis.incr(key);

      // Set expiry on first request
      if (current === 1) {
        await this.redis.expire(key, this.window);
      }

      const remaining = Math.max(0, this.limit - current);
      const allowed = current <= this.limit;

      return { allowed, remaining };
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open to prevent blocking legitimate requests
      return { allowed: true, remaining: this.limit };
    }
  }
}

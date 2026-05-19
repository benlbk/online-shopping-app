import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in interval
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

export function rateLimit(config: RateLimitConfig) {
  return {
    async check(key: string): Promise<RateLimitResult> {
      const now = Date.now();
      const windowStart = now - config.interval;
      
      // Remove old entries
      await redis.zremrangebyscore(`ratelimit:${key}`, 0, windowStart);
      
      // Count requests in current window
      const requestCount = await redis.zcard(`ratelimit:${key}`);
      
      if (requestCount >= config.maxRequests) {
        const oldestRequest = await redis.zrange(`ratelimit:${key}`, 0, 0);
        const resetTime = oldestRequest.length ? parseInt(oldestRequest[0]) + config.interval : now + config.interval;
        
        return {
          success: false,
          remaining: 0,
          resetTime
        };
      }
      
      return {
        success: true,
        remaining: config.maxRequests - requestCount,
        resetTime: now + config.interval
      };
    },

    async increment(key: string): Promise<void> {
      const now = Date.now();
      await redis.zadd(`ratelimit:${key}`, now, now.toString());
      await redis.expire(`ratelimit:${key}`, Math.ceil(config.interval / 1000));
    }
  };
}

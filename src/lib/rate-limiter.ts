import { redis } from './redis';
import { promisify } from 'util';

export class RateLimiter {
  private key: string;
  private limit: number;
  private window: number;

  constructor(key: string, limit: number, windowInSeconds: number) {
    this.key = `rate_limit:${key}`;
    this.limit = limit;
    this.window = windowInSeconds;
  }

  async check(): Promise<{ allowed: boolean; remaining: number }> {
    const multi = redis.multi();
    const now = Math.floor(Date.now() / 1000);
    
    try {
      // Remove expired entries
      multi.zremrangebyscore(this.key, 0, now - this.window);
      
      // Count existing entries
      multi.zcard(this.key);
      
      // Add new entry
      multi.zadd(this.key, now, `${now}-${Math.random()}`);
      
      // Set expiry on the set
      multi.expire(this.key, this.window);
      
      const execAsync = promisify(multi.exec).bind(multi);
      const results = await execAsync();
      
      const count = results[1] as number;
      const remaining = Math.max(0, this.limit - count);
      const allowed = count < this.limit;

      return { allowed, remaining };
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open with limited remaining in case of Redis errors
      return { allowed: true, remaining: 1 };
    }
  }
}
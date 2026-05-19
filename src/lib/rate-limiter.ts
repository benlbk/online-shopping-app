interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimit {
  timestamp: number;
  count: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimit>;
  private readonly config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.limits = new Map();
    this.config = config;
  }

  checkRate(key: string): boolean {
    const now = Date.now();
    const limit = this.limits.get(key);

    if (!limit) {
      this.limits.set(key, { timestamp: now, count: 1 });
      return true;
    }

    if (now - limit.timestamp > this.config.windowMs) {
      // Reset window
      this.limits.set(key, { timestamp: now, count: 1 });
      return true;
    }

    if (limit.count >= this.config.maxRequests) {
      return false;
    }

    limit.count++;
    return true;
  }

  // Cleanup old entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, limit] of this.limits.entries()) {
      if (now - limit.timestamp > this.config.windowMs) {
        this.limits.delete(key);
      }
    }
  }
}
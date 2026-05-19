interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
  trustProxy: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry>;
  private config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.limits = new Map();
    this.config = config;
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  checkLimit(clientIp: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(clientIp);

    if (!entry || now >= entry.resetTime) {
      // New or expired entry
      this.limits.set(clientIp, {
        count: 1,
        resetTime: now + this.config.windowMs
      });
      return true;
    }

    if (entry.count >= this.config.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  private cleanup() {
    const now = Date.now();
    for (const [ip, entry] of this.limits.entries()) {
      if (now >= entry.resetTime) {
        this.limits.delete(ip);
      }
    }
  }
}
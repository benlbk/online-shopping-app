interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimiterEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private requests: Map<string, RateLimiterEntry>;

  constructor(config: RateLimiterConfig) {
    this.windowMs = config.windowMs;
    this.maxRequests = config.maxRequests;
    this.requests = new Map();
  }

  allowRequest(clientId: string): boolean {
    const now = Date.now();
    const entry = this.requests.get(clientId);

    if (!entry || now > entry.resetTime) {
      this.requests.set(clientId, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}
interface RateLimiterOptions {
  windowMs: number; // The time window in milliseconds
  max: number; // Max number of requests within the time window
}

interface RateLimitResult {
  success: boolean;
  remainingRequests: number;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private options: RateLimiterOptions;
  private requests: Map<string, RequestRecord>;

  constructor(options: RateLimiterOptions) {
    this.options = options;
    this.requests = new Map();
  }

  async check(ip: string): Promise<RateLimitResult> {
    const now = Date.now();
    const record = this.requests.get(ip);

    // Clean up expired records
    this.cleanup();

    if (!record) {
      // First request from this IP
      this.requests.set(ip, {
        count: 1,
        resetTime: now + this.options.windowMs
      });
      return {
        success: true,
        remainingRequests: this.options.max - 1
      };
    }

    if (now > record.resetTime) {
      // Window expired, reset counter
      record.count = 1;
      record.resetTime = now + this.options.windowMs;
      return {
        success: true,
        remainingRequests: this.options.max - 1
      };
    }

    if (record.count >= this.options.max) {
      return {
        success: false,
        remainingRequests: 0
      };
    }

    // Increment counter
    record.count++;
    return {
      success: true,
      remainingRequests: this.options.max - record.count
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [ip, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(ip);
      }
    }
  }
}

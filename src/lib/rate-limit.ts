import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

type RateLimitResponse = {
  success: boolean;
  remaining: number;
};

export const rateLimit = {
  async check(
    identifier: string,
    limit: number,
    window: string
  ): Promise<RateLimitResponse> {
    const key = `rate-limit:${identifier}`;
    const windowMs = ms(window);

    const [count] = await redis
      .multi()
      .incr(key)
      .expire(key, Math.floor(windowMs / 1000))
      .exec();

    const remaining = Math.max(0, limit - (count as number));

    return {
      success: (count as number) <= limit,
      remaining
    };
  }
};

function ms(str: string): number {
  const map: Record<string, number> = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };
  const match = str.match(/^(\d+)([mhd])$/);
  if (!match) throw new Error('Invalid time format');
  return parseInt(match[1]) * map[match[2]];
}

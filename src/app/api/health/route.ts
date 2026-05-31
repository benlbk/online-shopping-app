import { NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/rate-limiter';
import { HealthService } from './health.service';
import { Config } from '@/config';

const rateLimiter = new RateLimiter({
  maxRequests: Config.HEALTH_CHECK_RATE_LIMIT,
  windowMs: Config.HEALTH_CHECK_RATE_WINDOW_MS
});

const healthService = new HealthService();

export async function GET() {
  try {
    const rateLimit = await rateLimiter.check();
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { status: 'error', message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const status = await healthService.getStatus();
    return NextResponse.json(
      status,
      { status: status.database_connected ? 200 : 503 }
    );
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
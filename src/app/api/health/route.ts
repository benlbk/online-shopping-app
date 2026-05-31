import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { DatabaseHealthCache } from './database-health-cache';
import { HEALTH_CHECK_CONFIG } from './config';

const rateLimiter = new RateLimiter({
  maxRequests: Number(HEALTH_CHECK_CONFIG.RATE_LIMIT.MAX_REQUESTS),
  windowMs: Number(HEALTH_CHECK_CONFIG.RATE_LIMIT.WINDOW_MS)
});

async function checkDatabase(): Promise<boolean> {
  const cache = DatabaseHealthCache.getInstance();
  const cachedResult = cache.get();
  if (cachedResult !== null) {
    return cachedResult;
  }

  try {
    const db = await getDbConnection();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), Number(HEALTH_CHECK_CONFIG.DATABASE_TIMEOUT_MS));

    try {
      await db.query('SELECT 1', { signal: controller.signal });
      cache.set(true);
      return true;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('Database health check failed:', error);
    cache.set(false);
    return false;
  }
}

export async function GET() {
  const rateLimit = await rateLimiter.check();
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { status: 'error', message: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  const dbConnected = await checkDatabase();
  const uptimeSeconds = Math.floor(process.uptime());

  const response = {
    status: dbConnected ? 'healthy' : 'unhealthy',
    database_connected: dbConnected,
    uptime_seconds: uptimeSeconds,
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(
    response,
    { status: dbConnected ? 200 : 503 }
  );
}
import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { HealthCheckResponse } from './types';

const START_TIME = Date.now();
const DB_TIMEOUT = 2000; // 2 second timeout
const MAX_REQUESTS_PER_MINUTE = 60;

const limiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: MAX_REQUESTS_PER_MINUTE
});

export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  try {
    // Rate limiting check
    const rateLimit = await limiter.check();
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Rate limit exceeded',
          uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
          database_connected: false,
          timestamp: new Date().toISOString()
        },
        { status: 429 }
      );
    }

    // Database health check with timeout
    const dbHealthy = await Promise.race([
      checkDatabase(),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), DB_TIMEOUT);
      })
    ]);

    const response: HealthCheckResponse = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      database_connected: dbHealthy,
      uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(
      response,
      { status: dbHealthy ? 200 : 503 }
    );
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Internal server error',
        uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
        database_connected: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

async function checkDatabase(): Promise<boolean> {
  try {
    const connection = await getDbConnection();
    const result = await connection.query('SELECT 1');
    return result.rows?.[0]?.['?column?'] === 1;
  } catch {
    return false;
  }
}
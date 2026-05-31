import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { HealthCheckResponse, DatabaseCheckResult } from './types';

const START_TIME = Date.now();
const DB_TIMEOUT = 2000; // 2 seconds
const rateLimiter = new RateLimiter('health-check', 10, 60); // 10 requests per minute

async function checkDatabase(): Promise<DatabaseCheckResult> {
  const connection = await getDbConnection();
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database timeout')), DB_TIMEOUT);
    });

    await Promise.race([
      connection.query('SELECT 1'),
      timeoutPromise
    ]);

    return { connected: true };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  } finally {
    connection.release();
  }
}

export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  // Check rate limit
  const rateLimit = await rateLimiter.check();
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        status: 'error',
        database_connected: false,
        uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
        timestamp: new Date().toISOString(),
        error: 'Rate limit exceeded'
      },
      {
        status: 429,
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Cache-Control': 'no-store'
        }
      }
    );
  }

  // Check database health
  const dbStatus = await checkDatabase();
  const uptime = Math.floor((Date.now() - START_TIME) / 1000);

  const response: HealthCheckResponse = {
    status: dbStatus.connected ? 'healthy' : 'unhealthy',
    database_connected: dbStatus.connected,
    uptime_seconds: uptime,
    timestamp: new Date().toISOString()
  };

  if (dbStatus.error) {
    response.error = dbStatus.error;
  }

  return NextResponse.json(response, {
    status: dbStatus.connected ? 200 : 503,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY', 
      'Cache-Control': 'no-store'
    }
  });
}
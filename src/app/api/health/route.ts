import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { cache } from '@/lib/cache';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'error';
  database_connected: boolean;
  uptime_seconds: number;
  timestamp: string;
}

const DB_CHECK_TIMEOUT = 2000;
const CACHE_TTL = 5000; // 5 seconds cache
const startTime = Date.now();
const rateLimiter = new RateLimiter('health-check', 10, 60); // 10 requests per minute

async function checkDatabase(): Promise<boolean> {
  try {
    const cachedStatus = await cache.get('db-health-status');
    if (cachedStatus !== undefined) {
      return cachedStatus as boolean;
    }

    const connection = await getDbConnection();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database timeout')), DB_CHECK_TIMEOUT);
    });

    await Promise.race([
      connection.query('SELECT 1'),
      timeoutPromise
    ]);

    await cache.set('db-health-status', true, CACHE_TTL);
    return true;
  } catch (error) {
    await cache.set('db-health-status', false, CACHE_TTL);
    console.error('Database health check failed:', error);
    return false;
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const rateLimit = await rateLimiter.check();
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { status: 'error', message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const dbConnected = await checkDatabase();
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    const healthStatus: HealthStatus = {
      status: dbConnected ? 'healthy' : 'unhealthy',
      database_connected: dbConnected,
      uptime_seconds: uptimeSeconds,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(
      healthStatus,
      { status: dbConnected ? 200 : 503 }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

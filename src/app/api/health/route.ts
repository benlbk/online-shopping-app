import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { Cache } from '@/lib/cache';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  database_connected: boolean;
  uptime_seconds: number;
  timestamp: string;
}

const DB_CHECK_TIMEOUT = 2000; // 2 seconds
const RATE_LIMIT = {
  window: 60, // 1 minute
  max: 60    // 60 requests
};
const CACHE_TTL = 5000; // 5 seconds

const healthCache = new Cache<boolean>(CACHE_TTL);
const rateLimiter = new RateLimiter(RATE_LIMIT.window, RATE_LIMIT.max);

async function checkDatabase(): Promise<boolean> {
  try {
    const cachedStatus = healthCache.get('db_status');
    if (cachedStatus !== undefined) {
      return cachedStatus;
    }

    const connection = await getDbConnection();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database check timed out')), DB_CHECK_TIMEOUT);
    });

    const queryPromise = connection.query('SELECT 1');
    await Promise.race([queryPromise, timeoutPromise]);
    
    healthCache.set('db_status', true);
    return true;
  } catch (error) {
    logger.error('Database health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    healthCache.set('db_status', false);
    return false;
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const rateCheck = await rateLimiter.check();
    if (!rateCheck.allowed) {
      logger.warn('Health check rate limit exceeded');
      return NextResponse.json(
        { status: 'error', message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const dbConnected = await checkDatabase();
    const status: HealthStatus = {
      status: dbConnected ? 'healthy' : 'unhealthy',
      database_connected: dbConnected,
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    };

    logger.info('Health check completed', { status });

    return NextResponse.json(
      status,
      { status: dbConnected ? 200 : 503 }
    );
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'error';
  database_connected: boolean;
  uptime_seconds: number;
  timestamp: string;
}

const START_TIME = Date.now();
const DB_TIMEOUT = 2000;
const rateLimiter = new RateLimiter('health-check', 10, 60);

async function checkDatabase(): Promise<boolean> {
  try {
    const connection = await getDbConnection();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database timeout')), DB_TIMEOUT);
    });

    await Promise.race([
      connection.query('SELECT 1'),
      timeoutPromise
    ]);
    return true;
  } catch (error) {
    logger.error('Database health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    return false;
  }
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  try {
    const rateLimit = await rateLimiter.check();
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          status: 'error',
          database_connected: false,
          uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
          timestamp: new Date().toISOString()
        },
        { status: 429 }
      );
    }

    const dbConnected = await checkDatabase();
    const status: HealthStatus = {
      status: dbConnected ? 'healthy' : 'unhealthy',
      database_connected: dbConnected,
      uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
      timestamp: new Date().toISOString()
    };

    logger.info('Health check completed', { status });

    return NextResponse.json(
      status,
      { status: dbConnected ? 200 : 503 }
    );
  } catch (error) {
    logger.error('Health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    return NextResponse.json(
      {
        status: 'error',
        database_connected: false,
        uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

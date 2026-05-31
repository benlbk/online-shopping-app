import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { validateDatabaseUrl } from '@/lib/security';

const START_TIME = Date.now();
const DB_TIMEOUT = 2000;
const MAX_REQUESTS_PER_MINUTE = 60;

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'error';
  database_connected: boolean;
  uptime_seconds: number;
  timestamp: string;
  version?: string;
}

async function checkDatabase(): Promise<boolean> {
  try {
    // Validate database URL before connecting
    if (!validateDatabaseUrl(process.env.DATABASE_URL)) {
      throw new Error('Invalid database URL');
    }

    const db = await getDbConnection();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database timeout')), DB_TIMEOUT);
    });

    // Race between query and timeout
    await Promise.race([
      db.query('SELECT 1'),
      timeoutPromise
    ]);

    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

function getUptime(): number {
  return Math.floor((Date.now() - START_TIME) / 1000);
}

export async function GET(): Promise<NextResponse> {
  try {
    // Rate limiting check
    const limiter = new RateLimiter('health-check', MAX_REQUESTS_PER_MINUTE);
    const rateLimitCheck = await limiter.check();

    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Rate limit exceeded',
          retry_after: rateLimitCheck.retryAfter
        },
        { status: 429 }
      );
    }

    // Perform health checks in parallel
    const [dbConnected] = await Promise.all([
      checkDatabase()
    ]);

    const response: HealthResponse = {
      status: dbConnected ? 'healthy' : 'unhealthy',
      database_connected: dbConnected,
      uptime_seconds: getUptime(),
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION
    };

    return NextResponse.json(
      response,
      { status: dbConnected ? 200 : 503 }
    );

  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

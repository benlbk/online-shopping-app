import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'error';
  database_connected: boolean;
  uptime_seconds: number;
  timestamp: string;
}

// Cache health check results
let lastCheck: {
  timestamp: number;
  status: HealthStatus;
} | null = null;

const CACHE_TTL = 5000; // 5 seconds cache
const DB_TIMEOUT = 2000; // 2 second timeout

async function checkDatabase(): Promise<boolean> {
  try {
    const connection = await getDbConnection();
    if (!connection) return false;

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database timeout')), DB_TIMEOUT);
    });

    const queryPromise = connection.query('SELECT 1');
    await Promise.race([queryPromise, timeoutPromise]);
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

function getUptime(): number {
  return Math.floor(process.uptime());
}

async function getHealthStatus(): Promise<HealthStatus> {
  // Return cached result if valid
  if (lastCheck && Date.now() - lastCheck.timestamp < CACHE_TTL) {
    return lastCheck.status;
  }

  const dbConnected = await checkDatabase();
  const status: HealthStatus = {
    status: dbConnected ? 'healthy' : 'unhealthy',
    database_connected: dbConnected,
    uptime_seconds: getUptime(),
    timestamp: new Date().toISOString()
  };

  // Update cache
  lastCheck = {
    timestamp: Date.now(),
    status
  };

  return status;
}

export async function GET(): Promise<NextResponse> {
  try {
    const rateLimiter = new RateLimiter('health-check', 10, 60); // 10 requests per minute
    const rateLimit = await rateLimiter.check();

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { status: 'error', message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const health = await getHealthStatus();
    const statusCode = health.status === 'healthy' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
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

import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { DatabaseHealthMonitor } from './DatabaseHealthMonitor';
import { UptimeTracker } from './UptimeTracker';

// Configurable constants moved to environment variables
const DB_TIMEOUT_MS = Number(process.env.HEALTH_DB_TIMEOUT_MS) || 2000;
const RATE_LIMIT = Number(process.env.HEALTH_RATE_LIMIT) || 100;
const RATE_WINDOW_MS = Number(process.env.HEALTH_RATE_WINDOW_MS) || 60000;

// Singleton instances
const dbMonitor = new DatabaseHealthMonitor();
const uptimeTracker = new UptimeTracker();
const rateLimiter = new RateLimiter(RATE_LIMIT, RATE_WINDOW_MS);

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'error';
  database_connected?: boolean;
  uptime_seconds?: number;
  timestamp: string;
  message?: string;
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  // Rate limiting check
  const rateLimit = await rateLimiter.check();
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Rate limit exceeded',
        timestamp: new Date().toISOString()
      },
      { status: 429 }
    );
  }

  try {
    // Get database status using monitor with proper caching
    const dbStatus = await dbMonitor.checkHealth(DB_TIMEOUT_MS);
    
    const response: HealthResponse = {
      status: dbStatus ? 'healthy' : 'unhealthy',
      database_connected: dbStatus,
      uptime_seconds: uptimeTracker.getUptime(),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(
      response,
      { status: dbStatus ? 200 : 503 }
    );

  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Internal error during health check',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

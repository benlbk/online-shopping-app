import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { DatabaseHealthMonitor } from './DatabaseHealthMonitor';
import { UptimeTracker } from './UptimeTracker';
import { HealthResponse } from './types';

// Configurable rate limits loaded from environment
const RATE_LIMIT = {
  requests: Number(process.env.HEALTH_CHECK_RATE_LIMIT) || 100,
  window: Number(process.env.HEALTH_CHECK_RATE_WINDOW) || 60
};

// Connection pool configuration
const DB_POOL = {
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
};

const dbMonitor = new DatabaseHealthMonitor(DB_POOL);
const uptimeTracker = UptimeTracker.getInstance();
const rateLimiter = new RateLimiter(RATE_LIMIT.requests, RATE_LIMIT.window);

export async function GET(): Promise<NextResponse> {
  try {
    // Check rate limit
    const rateLimit = await rateLimiter.check();
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { status: 'error', message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Get health status
    const dbStatus = await dbMonitor.checkHealth();
    const uptime = uptimeTracker.getUptimeSeconds();

    const response: HealthResponse = {
      status: dbStatus ? 'healthy' : 'unhealthy',
      database_connected: dbStatus,
      uptime_seconds: uptime,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(
      response,
      { status: dbStatus ? 200 : 503 }
    );

  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
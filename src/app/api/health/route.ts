import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { HealthCheckCache } from './health-cache';
import { DatabaseHealthChecker } from './database-checker';
import { UptimeTracker } from './uptime-tracker';

const CACHE_TTL = 5000; // 5 seconds
const DB_TIMEOUT = 2000; // 2 seconds

// Response schema validation
const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy', 'error']),
  database_connected: z.boolean(),
  uptime_seconds: z.number(),
  timestamp: z.string()
});

type HealthResponse = z.infer<typeof HealthResponseSchema>;

// Singleton instances
const healthCache = new HealthCheckCache(CACHE_TTL);
const dbChecker = new DatabaseHealthChecker(DB_TIMEOUT);
const uptimeTracker = new UptimeTracker();
const rateLimiter = new RateLimiter('health-check', 10, 60);

export async function GET() {
  try {
    // Rate limiting check
    const rateLimit = await rateLimiter.check();
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { status: 'error', message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Check cache first
    const cachedResponse = healthCache.get();
    if (cachedResponse) {
      return NextResponse.json(cachedResponse);
    }

    // Check database health
    const dbConnection = await getDbConnection();
    const dbHealthy = await dbChecker.check(dbConnection);

    const response: HealthResponse = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      database_connected: dbHealthy,
      uptime_seconds: uptimeTracker.getUptime(),
      timestamp: new Date().toISOString()
    };

    // Validate response
    HealthResponseSchema.parse(response);

    // Cache successful response
    healthCache.set(response);

    return NextResponse.json(
      response,
      { status: dbHealthy ? 200 : 503 }
    );

  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        database_connected: false,
        uptime_seconds: uptimeTracker.getUptime(),
        timestamp: new Date().toISOString(),
        message: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
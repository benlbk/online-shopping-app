import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { getUptime } from '@/lib/health';
import { z } from 'zod';

// Environment validation schema
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DB_TIMEOUT_MS: z.string().transform(val => parseInt(val, 10)).default('2000'),
  HEALTH_CHECK_CACHE_SEC: z.string().transform(val => parseInt(val, 10)).default('10')
});

// Validate environment variables at startup
const env = envSchema.parse(process.env);

// Cache health check results
type HealthCheckCache = {
  timestamp: number;
  result: boolean;
};

let healthCheckCache: HealthCheckCache | null = null;

export async function GET() {
  const uptime = getUptime();
  let dbConnected = false;

  try {
    // Check cache first
    const now = Date.now();
    if (healthCheckCache && (now - healthCheckCache.timestamp) < (env.HEALTH_CHECK_CACHE_SEC * 1000)) {
      dbConnected = healthCheckCache.result;
    } else {
      // Perform DB check with timeout
      const dbCheckPromise = checkDatabaseConnection();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database check timeout')), env.DB_TIMEOUT_MS);
      });

      dbConnected = await Promise.race([dbCheckPromise, timeoutPromise]) as boolean;

      // Update cache
      healthCheckCache = {
        timestamp: now,
        result: dbConnected
      };
    }
  } catch (error) {
    console.error('Health check error:', error);
    dbConnected = false;
  }

  const status = dbConnected ? 'healthy' : 'degraded';
  const statusCode = dbConnected ? 200 : 503;

  return NextResponse.json({
    status,
    uptime_seconds: uptime,
    database_connected: dbConnected
  }, { status: statusCode });
}
import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { HealthCheckResponse } from './types';
import { cacheManager } from '@/lib/cache';

const CACHE_KEY = 'health_status';
const CACHE_TTL = 10; // 10 seconds
const DB_TIMEOUT = 2000; // 2 seconds

export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  const rateLimiter = new RateLimiter('health_check');
  const rateLimitCheck = await rateLimiter.check();

  if (!rateLimitCheck.allowed) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Rate limit exceeded',
        timestamp: new Date().toISOString(),
        uptime_seconds: process.uptime(),
        database_connected: false
      },
      { status: 429 }
    );
  }

  // Check cache first
  const cachedStatus = await cacheManager.get<HealthCheckResponse>(CACHE_KEY);
  if (cachedStatus) {
    return NextResponse.json(cachedStatus);
  }

  let dbConnection = null;
  try {
    dbConnection = await getDbConnection();
    
    // Use parameterized query for safety
    const query = {
      text: 'SELECT $1::integer as check',
      values: [1]
    };

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database timeout')), DB_TIMEOUT);
    });

    await Promise.race([
      dbConnection.query(query),
      timeoutPromise
    ]);

    const response: HealthCheckResponse = {
      status: 'healthy',
      database_connected: true,
      uptime_seconds: process.uptime(),
      timestamp: new Date().toISOString()
    };

    // Cache successful response
    await cacheManager.set(CACHE_KEY, response, CACHE_TTL);

    return NextResponse.json(response);
  } catch (error) {
    const response: HealthCheckResponse = {
      status: 'unhealthy',
      database_connected: false,
      uptime_seconds: process.uptime(),
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    return NextResponse.json(response, { status: 503 });
  } finally {
    if (dbConnection) {
      await dbConnection.release();
    }
  }
}

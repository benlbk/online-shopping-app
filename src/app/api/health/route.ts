import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { HealthCheckCache } from '@/lib/health-cache';
import { DatabaseError } from '@/lib/errors';

const START_TIME = Date.now();
const DB_TIMEOUT = 2000; // 2 second timeout
const CACHE_TTL = 5000; // 5 second cache

const healthCache = new HealthCheckCache(CACHE_TTL);
const rateLimiter = new RateLimiter();

async function checkDatabase(): Promise<boolean> {
  try {
    const connection = await getDbConnection();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new DatabaseError('Database check timed out')), DB_TIMEOUT);
    });

    await Promise.race([
      connection.query('SELECT 1'),
      timeoutPromise
    ]);
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

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

    // Try to get cached response
    const cachedResponse = healthCache.get();
    if (cachedResponse) {
      return NextResponse.json(cachedResponse);
    }

    // Check database health
    const dbConnected = await checkDatabase();
    
    const response = {
      status: dbConnected ? 'healthy' : 'unhealthy',
      database_connected: dbConnected,
      uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
      timestamp: new Date().toISOString()
    };

    // Cache the response
    healthCache.set(response);

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

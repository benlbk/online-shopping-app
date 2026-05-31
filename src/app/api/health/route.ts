import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { Redis } from 'ioredis';

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'error';
  database_connected: boolean;
  uptime_seconds: number;
  timestamp: string;
}

// Use Redis for distributed uptime tracking
const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  connectTimeout: 1000
});

// Cache health check results
let healthCache: {
  response: HealthResponse;
  timestamp: number;
} | null = null;

const CACHE_TTL = 5000; // 5 seconds
const DB_TIMEOUT = 2000; // 2 seconds

const rateLimiter = new RateLimiter({
  windowMs: 60000,
  max: 100
});

export async function GET() {
  try {
    // Check rate limit
    const rateLimit = await rateLimiter.check();
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { status: 'error', message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Use cached response if available and fresh
    if (healthCache && Date.now() - healthCache.timestamp < CACHE_TTL) {
      return NextResponse.json(healthCache.response);
    }

    // Get uptime from Redis
    const startTime = await redis.get('service_start_time');
    if (!startTime) {
      await redis.set('service_start_time', Date.now().toString());
    }
    const uptime = Math.floor(
      (Date.now() - parseInt(startTime || Date.now().toString())) / 1000
    );

    // Check database health with timeout
    let dbConnected = false;
    try {
      const db = await getDbConnection();
      const dbCheckPromise = db.query('SELECT 1');
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database timeout')), DB_TIMEOUT)
      );
      await Promise.race([dbCheckPromise, timeoutPromise]);
      dbConnected = true;
    } catch (error) {
      console.error('Database health check failed:', error);
      dbConnected = false;
    }

    const response: HealthResponse = {
      status: dbConnected ? 'healthy' : 'unhealthy',
      database_connected: dbConnected,
      uptime_seconds: uptime,
      timestamp: new Date().toISOString()
    };

    // Cache the response
    healthCache = {
      response,
      timestamp: Date.now()
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
  } finally {
    // Clean up resources
    if (redis.status === 'ready') {
      await redis.quit();
    }
  }
}

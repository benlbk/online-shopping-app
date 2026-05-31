import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { RedisClient } from '@/lib/redis';

const CACHE_TTL = 5000; // 5 seconds
const DB_TIMEOUT = 2000; // 2 seconds
const RATE_LIMIT = 100; // requests per minute

interface HealthStatus {
  status: string;
  database_connected: boolean;
  redis_connected: boolean;
  timestamp: string;
}

// Use distributed cache for health check results
const redisClient = new RedisClient();
const rateLimiter = new RateLimiter(RATE_LIMIT, 60);

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
    const cachedResponse = await redisClient.get('health_status');
    if (cachedResponse) {
      return NextResponse.json(JSON.parse(cachedResponse));
    }

    // Check database health with timeout
    let dbConnected = false;
    try {
      const db = await getDbConnection();
      const dbCheckPromise = db.query('SELECT 1');
      await Promise.race([
        dbCheckPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('DB Timeout')), DB_TIMEOUT)
        )
      ]);
      dbConnected = true;
    } catch (error) {
      console.error('Database health check failed:', error);
      dbConnected = false;
    }

    // Check Redis connection
    let redisConnected = false;
    try {
      await redisClient.ping();
      redisConnected = true;
    } catch (error) {
      console.error('Redis health check failed:', error);
      redisConnected = false;
    }

    const status: HealthStatus = {
      status: dbConnected && redisConnected ? 'healthy' : 'unhealthy',
      database_connected: dbConnected,
      redis_connected: redisConnected,
      timestamp: new Date().toISOString()
    };

    // Cache the response
    await redisClient.setex('health_status', CACHE_TTL / 1000, JSON.stringify(status));

    return NextResponse.json(
      status,
      { status: dbConnected && redisConnected ? 200 : 503 }
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

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getDbConnection } from '@/lib/db';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const START_TIME = Date.now();

// Use distributed rate limiter with Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'health_check'
});

// Cache health check results with TTL
const CACHE_TTL = 10000; // 10 seconds
let healthCache: {
  timestamp: number;
  status: number;
  data: any;
} | null = null;

async function checkDatabaseConnection() {
  try {
    const db = await getDbConnection();
    // Actually test the connection with a simple query
    const result = await Promise.race([
      db.query('SELECT 1'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 2000)
      )
    ]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

export async function GET() {
  // Get client IP safely
  const forwardedFor = headers().get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
  
  // Rate limiting
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  // Check cache
  if (healthCache && Date.now() - healthCache.timestamp < CACHE_TTL) {
    return NextResponse.json(healthCache.data, { status: healthCache.status });
  }

  // Perform health check
  const uptime_seconds = Math.floor((Date.now() - START_TIME) / 1000);
  const database_connected = await checkDatabaseConnection();

  const status = database_connected ? 'healthy' : 'degraded';
  const httpStatus = database_connected ? 200 : 503;

  const responseData = {
    status,
    uptime_seconds,
    database_connected
  };

  // Update cache
  healthCache = {
    timestamp: Date.now(),
    status: httpStatus,
    data: responseData
  };

  return NextResponse.json(responseData, { status: httpStatus });
}

// Cleanup rate limiter data periodically
setInterval(async () => {
  try {
    await redis.del('health_check:requests');
  } catch (error) {
    console.error('Rate limiter cleanup failed:', error);
  }
}, 3600000); // Every hour
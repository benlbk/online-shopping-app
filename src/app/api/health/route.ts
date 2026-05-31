import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';

const CACHE_TTL = 5000; // 5 seconds
const DB_TIMEOUT = 2000; // 2 seconds
let lastCheck: number | null = null;
let cachedResponse: NextResponse | null = null;

interface HealthStatus {
  status: string;
  database_connected: boolean;
  redis_connected: boolean;
  timestamp: string;
}

async function checkDatabase(): Promise<boolean> {
  try {
    const db = await getDbConnection();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database timeout')), DB_TIMEOUT);
    });
    
    const queryPromise = db.query('SELECT 1');
    await Promise.race([queryPromise, timeoutPromise]);
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

async function checkRedis(): Promise<boolean> {
  const redis = await getRedisClient();
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  } finally {
    await redis.quit(); // Properly close connection
  }
}

export async function GET() {
  // Rate limiting
  const limiter = new RateLimiter({
    maxRequests: 10,
    windowMs: 60000,
    trustProxy: true
  });

  const rateLimit = await limiter.check();
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { status: 'error', message: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // Use cached response if within TTL
  const now = Date.now();
  if (lastCheck && cachedResponse && (now - lastCheck < CACHE_TTL)) {
    return cachedResponse;
  }

  // Perform health checks
  const [dbConnected, redisConnected] = await Promise.all([
    checkDatabase(),
    checkRedis()
  ]);

  const status: HealthStatus = {
    status: dbConnected && redisConnected ? 'healthy' : 'unhealthy',
    database_connected: dbConnected,
    redis_connected: redisConnected,
    timestamp: new Date().toISOString()
  };

  const responseStatus = status.status === 'healthy' ? 200 : 503;
  
  // Update cache
  lastCheck = now;
  cachedResponse = NextResponse.json(status, {
    status: responseStatus,
    headers: {
      'Cache-Control': `private, max-age=${CACHE_TTL / 1000}`,
      'X-Rate-Limit-Remaining': rateLimit.remaining.toString()
    }
  });

  return cachedResponse;
}
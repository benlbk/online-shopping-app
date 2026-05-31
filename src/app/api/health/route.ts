import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { kv } from '@vercel/kv';

const CACHE_KEY = 'health_status';
const CACHE_TTL = 5; // 5 seconds
const DB_TIMEOUT = 2000; // 2 seconds

interface HealthStatus {
  status: string;
  database_connected: boolean;
  redis_connected: boolean;
  timestamp: string;
}

async function checkDatabase(): Promise<boolean> {
  try {
    const conn = await getDbConnection();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DB_TIMEOUT);
    
    await Promise.race([
      conn.query('SELECT 1', undefined, { signal: controller.signal }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), DB_TIMEOUT)
      )
    ]);
    
    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

async function checkRedis(): Promise<boolean> {
  try {
    await kv.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

async function getHealthStatus(): Promise<HealthStatus> {
  // Try to get cached status
  const cached = await kv.get<HealthStatus>(CACHE_KEY);
  if (cached) {
    return cached;
  }

  // Check critical dependencies
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

  // Cache the result
  await kv.set(CACHE_KEY, status, { ex: CACHE_TTL });
  return status;
}

export async function GET() {
  // Rate limiting
  const limiter = new RateLimiter();
  const rateLimit = await limiter.check();
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { status: 'error', message: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  try {
    const health = await getHealthStatus();
    
    return NextResponse.json(
      health,
      { 
        status: health.status === 'healthy' ? 200 : 503,
        headers: {
          'Cache-Control': `public, max-age=${CACHE_TTL}`,
          'X-RateLimit-Remaining': rateLimit.remaining.toString()
        }
      }
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
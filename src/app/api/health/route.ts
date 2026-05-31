import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';
import { redis } from '@/lib/redis';
import { promisify } from 'util';
import { promises as fs } from 'fs';

const CACHE_TTL = 5000; // 5 seconds
const DB_TIMEOUT = 2000; // 2 seconds
const RATE_LIMIT = 100; // requests per minute
let startTime = Date.now();
let healthCache: any = null;
let lastCheck = 0;

async function checkDatabase() {
  try {
    const db = await getDbConnection();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database timeout')), DB_TIMEOUT)
    );
    
    const queryPromise = db.query('SELECT 1');
    await Promise.race([queryPromise, timeoutPromise]);
    
    await db.release(); // Properly release connection
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

async function checkRedis() {
  try {
    const pingAsync = promisify(redis.ping).bind(redis);
    await Promise.race([
      pingAsync(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), DB_TIMEOUT))
    ]);
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

async function checkDiskSpace() {
  try {
    const stats = await fs.stat('.');
    return stats.size > 0;
  } catch (error) {
    console.error('Disk check failed:', error);
    return false;
  }
}

export async function GET() {
  // Rate limiting
  const limiter = new RateLimiter('health-check', RATE_LIMIT, 60);
  const rateLimit = await limiter.check();
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { status: 'error', message: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // Use cached response if within TTL
  if (healthCache && Date.now() - lastCheck < CACHE_TTL) {
    return NextResponse.json(healthCache.data, { status: healthCache.status });
  }

  // Parallel health checks
  const [dbConnected, redisConnected, diskOk] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkDiskSpace()
  ]);

  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const isHealthy = dbConnected && redisConnected && diskOk;
  
  const response = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    uptime_seconds: uptime,
    database_connected: dbConnected,
    redis_connected: redisConnected,
    disk_ok: diskOk,
    timestamp: new Date().toISOString()
  };

  // Cache the response
  healthCache = {
    data: response,
    status: isHealthy ? 200 : 503
  };
  lastCheck = Date.now();

  return NextResponse.json(response, { 
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
      'X-RateLimit-Limit': RATE_LIMIT.toString(),
      'X-RateLimit-Remaining': rateLimit.remaining.toString()
    }
  });
}
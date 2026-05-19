import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { getUptime } from '@/lib/health';
import { RateLimiter } from '@/lib/rate-limiter';

const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10 // 10 requests per minute
});

const DB_CHECK_TIMEOUT = 2000; // 2 second timeout
const CACHE_TTL = 10000; // 10 second cache

// Cache for database status
let dbStatusCache = {
  status: false,
  lastChecked: 0
};

export async function GET(request: Request) {
  // Rate limiting
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimiter.allowRequest(clientIp)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  // Get uptime
  const uptime = getUptime();

  // Check database with caching
  let dbConnected = false;
  const now = Date.now();
  if (now - dbStatusCache.lastChecked > CACHE_TTL) {
    try {
      dbConnected = await Promise.race([
        checkDatabaseConnection(),
        new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Database check timeout')), DB_CHECK_TIMEOUT)
        )
      ]);
      dbStatusCache = {
        status: dbConnected,
        lastChecked: now
      };
    } catch (error) {
      dbConnected = false;
      dbStatusCache = {
        status: false,
        lastChecked: now
      };
    }
  } else {
    dbConnected = dbStatusCache.status;
  }

  const status = dbConnected ? 'healthy' : 'unhealthy';
  const statusCode = dbConnected ? 200 : 503;

  return NextResponse.json(
    {
      status,
      uptime_seconds: uptime,
      database_connected: dbConnected
    },
    {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'"
      }
    }
  );
}
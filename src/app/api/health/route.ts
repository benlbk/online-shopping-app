import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { getUptime } from '@/lib/health';
import { RateLimiter } from '@/lib/rate-limiter';

const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  trustProxy: true
});

const CACHE_TTL = 10000; // 10 seconds
let healthCache: {
  timestamp: number;
  response: NextResponse;
} | null = null;

export async function GET(request: Request) {
  // Rate limiting check
  const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
  if (!rateLimiter.checkLimit(clientIp)) {
    return NextResponse.json(
      { status: 'error', message: 'Too many requests' },
      { status: 429 }
    );
  }

  // Return cached response if valid
  if (healthCache && Date.now() - healthCache.timestamp < CACHE_TTL) {
    return healthCache.response;
  }

  try {
    // Database check with timeout
    const dbConnected = await Promise.race([
      checkDatabaseConnection(),
      new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 2000)
      )
    ]);

    const uptime = getUptime();
    const status = dbConnected ? 'healthy' : 'degraded';
    const statusCode = dbConnected ? 200 : 503;

    const response = NextResponse.json(
      {
        status,
        uptime_seconds: uptime,
        database_connected: dbConnected
      },
      {
        status: statusCode,
        headers: {
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'Cache-Control': 'no-store'
        }
      }
    );

    // Cache successful responses
    if (statusCode === 200) {
      healthCache = {
        timestamp: Date.now(),
        response: response.clone()
      };
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        uptime_seconds: getUptime(),
        database_connected: false
      },
      { status: 503 }
    );
  }
}
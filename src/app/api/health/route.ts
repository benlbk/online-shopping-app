import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { getUptime } from '@/lib/health';
import { RateLimiter } from '@/lib/rate-limiter';

const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10 // 10 requests per minute
});

const DB_CHECK_TIMEOUT = 2000; // 2 seconds
const CACHE_TTL = 10000; // 10 seconds

let lastCheckTime = 0;
let cachedDbStatus = false;

async function checkDatabaseWithTimeout(): Promise<boolean> {
  const now = Date.now();
  
  // Return cached result if within TTL
  if (now - lastCheckTime < CACHE_TTL) {
    return cachedDbStatus;
  }

  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database check timeout')), DB_CHECK_TIMEOUT);
    });

    const dbCheckPromise = checkDatabaseConnection();
    const result = await Promise.race([dbCheckPromise, timeoutPromise]);
    
    // Update cache
    lastCheckTime = now;
    cachedDbStatus = Boolean(result);
    
    return cachedDbStatus;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

export async function GET(request: Request) {
  // Rate limiting check
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimiter.checkRate(clientIp)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  try {
    const [dbConnected, uptimeSeconds] = await Promise.all([
      checkDatabaseWithTimeout(),
      getUptime()
    ]);

    const status = dbConnected ? 'healthy' : 'degraded';
    const statusCode = dbConnected ? 200 : 503;

    return NextResponse.json({
      status,
      uptime_seconds: uptimeSeconds,
      database_connected: dbConnected
    }, {
      status: statusCode
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      uptime_seconds: await getUptime(),
      database_connected: false,
      error: 'Internal service error'
    }, {
      status: 503
    });
  }
}
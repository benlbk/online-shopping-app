import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { checkDatabaseConnection } from '@/lib/db';
import { getUptime } from '@/lib/health';
import { RateLimiter } from '@/lib/rate-limiter';

// Initialize rate limiter with Redis backend
const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10 // 10 requests per window
});

// Cache health check results
let healthCache = {
  timestamp: 0,
  result: null,
  ttl: 10000 // 10 second cache
};

export async function GET() {
  try {
    // Get client IP safely
    const headersList = headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';

    // Rate limit by IP
    const rateLimitResult = await rateLimiter.check(clientIp);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { status: 'error', message: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Check cache
    const now = Date.now();
    if (healthCache.result && (now - healthCache.timestamp) < healthCache.ttl) {
      return healthCache.result;
    }

    // Get health status
    const dbConnected = await checkDatabaseConnection();
    const uptimeSeconds = getUptime();

    const status = dbConnected ? 'healthy' : 'degraded';
    const statusCode = dbConnected ? 200 : 503;

    const response = NextResponse.json({
      status,
      uptime_seconds: uptimeSeconds,
      database_connected: dbConnected
    }, { status: statusCode });

    // Update cache
    healthCache = {
      timestamp: now,
      result: response,
      ttl: healthCache.ttl
    };

    return response;

  } catch (error) {
    // Log error safely without exposing details
    console.error('Health check error:', error.message);
    
    return NextResponse.json({
      status: 'error',
      uptime_seconds: getUptime(),
      database_connected: false
    }, { status: 503 });
  }
}

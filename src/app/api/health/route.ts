import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { checkDatabaseConnection } from '@/lib/db';
import { getUptime } from '@/lib/health';
import { RateLimiter } from '@/lib/rate-limiter';

const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10 // limit each IP to 10 requests per windowMs
});

export async function GET() {
  try {
    // Apply rate limiting
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = await rateLimiter.check(ip);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    // Check database connection
    const dbConnected = await checkDatabaseConnection();
    
    // Get service uptime
    const uptimeSeconds = getUptime();

    // Prepare response
    const healthStatus = {
      status: dbConnected ? 'healthy' : 'degraded',
      uptime_seconds: uptimeSeconds,
      database_connected: dbConnected
    };

    return NextResponse.json(
      healthStatus,
      { status: dbConnected ? 200 : 503 }
    );

  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        uptime_seconds: getUptime(),
        database_connected: false
      },
      { status: 503 }
    );
  }
}

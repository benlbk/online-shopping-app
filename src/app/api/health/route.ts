import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { getUptime } from '@/lib/health';
import { cache } from '@/lib/cache';

const CACHE_KEY = 'health_status';
const CACHE_TTL = 10; // seconds

export async function GET() {
  try {
    // Try to get cached health status
    const cachedStatus = await cache.get(CACHE_KEY);
    if (cachedStatus) {
      return NextResponse.json(cachedStatus.data, {
        status: cachedStatus.data.status === 'healthy' ? 200 : 503
      });
    }

    const uptime = getUptime();
    const dbConnected = await Promise.race([
      checkDatabaseConnection(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 2000)
      )
    ]);

    const healthStatus = {
      status: dbConnected ? 'healthy' : 'degraded',
      uptime_seconds: uptime,
      database_connected: dbConnected
    };

    // Cache the result
    await cache.set(CACHE_KEY, healthStatus, CACHE_TTL);

    return NextResponse.json(healthStatus, {
      status: dbConnected ? 200 : 503
    });

  } catch (error) {
    const errorStatus = {
      status: 'unhealthy',
      uptime_seconds: getUptime(),
      database_connected: false
    };

    return NextResponse.json(errorStatus, { status: 503 });
  }
}
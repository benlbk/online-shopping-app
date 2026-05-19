import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { getUptime } from '@/lib/health';

const CACHE_TTL = 10000; // 10 seconds
let lastCheck = 0;
let cachedDbStatus = false;

async function getDatabaseStatus() {
  const now = Date.now();
  if (now - lastCheck < CACHE_TTL) {
    return cachedDbStatus;
  }

  try {
    cachedDbStatus = await checkDatabaseConnection();
    lastCheck = now;
    return cachedDbStatus;
  } catch (error) {
    return false;
  }
}

export async function GET() {
  const dbConnected = await getDatabaseStatus();
  const uptime = getUptime();

  const healthStatus = {
    status: dbConnected ? 'healthy' : 'degraded',
    uptime_seconds: uptime,
    database_connected: dbConnected
  };

  return new NextResponse(JSON.stringify(healthStatus), {
    status: dbConnected ? 200 : 503,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}

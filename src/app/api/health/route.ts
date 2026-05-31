import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

const startTime = Date.now();

async function checkDatabase(): Promise<boolean> {
  try {
    const db = await getDbConnection();
    await db.query('SELECT 1', { timeout: 2000 });
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

export async function GET() {
  const dbConnected = await checkDatabase();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  const healthStatus = {
    status: dbConnected ? 'healthy' : 'unhealthy',
    uptime_seconds: uptimeSeconds,
    database_connected: dbConnected
  };

  if (!dbConnected) {
    return NextResponse.json(healthStatus, { status: 503 });
  }

  return NextResponse.json(healthStatus, { status: 200 });
}

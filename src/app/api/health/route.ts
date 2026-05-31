import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

const startTime = Date.now();

const checkDbConnection = async (): Promise<boolean> => {
  try {
    const db = await getDbConnection();
    await db.ping();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};

export async function GET() {
  const dbConnected = await checkDbConnection();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  const healthStatus = {
    status: dbConnected ? 'UP' : 'DOWN',
    uptime_seconds: uptimeSeconds,
    database_connected: dbConnected,
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(
    healthStatus,
    { 
      status: dbConnected ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    }
  );
}

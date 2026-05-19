import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

const startTime = Date.now();
let lastDbCheck = 0;
let lastDbStatus = false;
const DB_CHECK_INTERVAL = 30000; // 30 seconds

async function checkDatabase(): Promise<boolean> {
  try {
    const db = await getDbConnection();
    await db.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

export async function GET() {
  // Check if we need to refresh database status
  const now = Date.now();
  if (now - lastDbCheck > DB_CHECK_INTERVAL) {
    lastDbStatus = await checkDatabase();
    lastDbCheck = now;
  }

  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  
  const healthStatus = {
    status: lastDbStatus ? 'healthy' : 'unhealthy',
    uptime_seconds: uptimeSeconds,
    database_connected: lastDbStatus
  };

  return NextResponse.json(
    healthStatus,
    { 
      status: lastDbStatus ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store'
      }
    }
  );
}

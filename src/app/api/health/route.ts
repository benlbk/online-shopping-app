import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { UptimeTracker } from '@/lib/uptime';

export async function GET() {
  try {
    // Check database connectivity
    const db = await getDbConnection();
    const isConnected = await db.raw('SELECT 1').timeout(2000);
    const dbConnected = !!isConnected;

    // Get uptime
    const uptimeSeconds = UptimeTracker.getInstance().getUptimeSeconds();

    // Prepare response
    const healthStatus = {
      status: dbConnected ? 'healthy' : 'unhealthy',
      uptime_seconds: uptimeSeconds,
      database_connected: dbConnected
    };

    // Return 503 if database is not connected
    if (!dbConnected) {
      return NextResponse.json(healthStatus, { status: 503 });
    }

    return NextResponse.json(healthStatus);
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      uptime_seconds: UptimeTracker.getInstance().getUptimeSeconds(),
      database_connected: false
    }, { status: 503 });
  }
}

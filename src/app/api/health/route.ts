import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

let startTime = Date.now();

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  uptime_seconds: number;
  database_connected: boolean;
}

export async function GET() {
  try {
    // Check database connectivity
    const dbConnection = await getDbConnection();
    const isConnected = await checkDbConnection(dbConnection);

    const response: HealthResponse = {
      status: isConnected ? 'healthy' : 'unhealthy',
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      database_connected: isConnected
    };

    if (!isConnected) {
      return NextResponse.json(response, { status: 503 });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Health check failed:', error);
    
    const errorResponse: HealthResponse = {
      status: 'unhealthy',
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      database_connected: false
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
}

async function checkDbConnection(connection: any): Promise<boolean> {
  try {
    // Add 2 second timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database check timeout')), 2000);
    });

    // Try simple query to verify connection
    const queryPromise = connection.query('SELECT 1');
    await Promise.race([queryPromise, timeoutPromise]);
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}
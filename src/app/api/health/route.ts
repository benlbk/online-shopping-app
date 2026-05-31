import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RateLimiter } from '@/lib/rate-limiter';

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'error';
  database_connected: boolean;
  uptime_seconds: number;
  timestamp: string;
}

const CACHE_TTL = 5000; // 5 seconds
const DB_TIMEOUT = 2000; // 2 seconds
let lastCheck: HealthResponse | null = null;
let lastCheckTime = 0;
const startTime = Date.now();

const rateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60000
});

async function checkDatabase(): Promise<boolean> {
  try {
    const db = await getDbConnection();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database timeout')), DB_TIMEOUT);
    });
    
    const queryPromise = db.query('SELECT 1');
    await Promise.race([queryPromise, timeoutPromise]);
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

async function getHealthStatus(): Promise<HealthResponse> {
  const now = Date.now();
  
  // Return cached response if within TTL
  if (lastCheck && (now - lastCheckTime) < CACHE_TTL) {
    return {
      ...lastCheck,
      uptime_seconds: Math.floor((now - startTime) / 1000),
      timestamp: new Date().toISOString()
    };
  }

  const dbConnected = await checkDatabase();
  const response: HealthResponse = {
    status: dbConnected ? 'healthy' : 'unhealthy',
    database_connected: dbConnected,
    uptime_seconds: Math.floor((now - startTime) / 1000),
    timestamp: new Date().toISOString()
  };

  lastCheck = response;
  lastCheckTime = now;
  return response;
}

export async function GET() {
  try {
    const rateLimit = await rateLimiter.check();
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          status: 'error',
          message: 'Rate limit exceeded',
          timestamp: new Date().toISOString()
        },
        { status: 429 }
      );
    }

    const health = await getHealthStatus();
    return NextResponse.json(
      health,
      { status: health.status === 'healthy' ? 200 : 503 }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

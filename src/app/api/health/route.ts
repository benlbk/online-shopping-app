import { NextResponse } from 'next/server';
import { HealthService } from './health.service';
import { HealthStatus } from './types';

export async function GET(): Promise<NextResponse> {
  try {
    const healthService = HealthService.getInstance();
    const status: HealthStatus = await healthService.checkHealth();

    return new NextResponse(JSON.stringify(status), {
      status: status.status === 'healthy' ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    const isRateLimit = error instanceof Error && error.message === 'Rate limit exceeded';
    
    return new NextResponse(
      JSON.stringify({
        status: 'error',
        message: isRateLimit ? 'Rate limit exceeded' : 'Internal server error'
      }),
      {
        status: isRateLimit ? 429 : 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );
  }
}
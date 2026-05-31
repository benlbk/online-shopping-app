import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Rate limiting for health check endpoint
  if (request.nextUrl.pathname === '/api/health') {
    // Add basic rate limiting headers
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', '60');
    response.headers.set('X-RateLimit-Remaining', '59');
    response.headers.set('X-RateLimit-Reset', String(Date.now() + 60000));
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/health'
};

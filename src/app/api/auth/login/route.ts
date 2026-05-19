import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { signJWT } from '@/lib/jwt';
import { rateLimit } from '@/lib/rate-limit';
import { invalidateUserSessions } from '@/lib/session';

// Login request validation schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

// Rate limiting configuration
const limiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes 
  maxRequests: 5
});

export async function POST(req: Request) {
  try {
    // Apply rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = await limiter.check(clientIp);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      await limiter.increment(clientIp);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate tokens
    const accessToken = await signJWT(
      { sub: user.id },
      { exp: '1h' } // Short lived access token
    );

    const refreshToken = await signJWT(
      { sub: user.id },
      { exp: '7d' } // Longer lived refresh token
    );

    // Store refresh token hash in DB
    await db.userSession.create({
      data: {
        userId: user.id,
        refreshToken: await bcrypt.hash(refreshToken, 10)
      }
    });

    // Set secure cookies
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      },
      { status: 200 }
    );

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 // 1 hour
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

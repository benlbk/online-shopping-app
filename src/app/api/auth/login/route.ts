import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { signJWT } from '@/lib/jwt';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

// Rate limiter: 5 attempts per 15 minutes
const limiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 500,
  maxRequests: 5
});

export async function POST(req: Request) {
  try {
    // Rate limiting check
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    try {
      await limiter.check(ip);
    } catch {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      // Use consistent timing to prevent timing attacks
      await bcrypt.compare(password, '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LcdYShVUICa.m4.P6');
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email before logging in' },
        { status: 403 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate short-lived JWT (1 hour)
    const token = await signJWT(
      { userId: user.id },
      { exp: Math.floor(Date.now() / 1000) + 60 * 60 }
    );

    // Set HTTP-only secure cookie
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 // 1 hour
    });

    return response;

  } catch (error) {
    logger.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
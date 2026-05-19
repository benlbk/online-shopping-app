import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { signJWT } from '@/lib/jwt';
import { rateLimit } from '@/lib/rate-limit';
import { passwordStrength } from '@/lib/password';

// Input validation schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

// Rate limiter configuration
const limiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 500,
  maxRequests: 5 // 5 attempts per 15 min window
});

export async function POST(req: Request) {
  try {
    // Rate limiting check
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = await limiter.check(ip);
    
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
      // Use consistent timing to prevent timing attacks
      await bcrypt.compare(password, '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LcdYShVUoDTYqFpji');
      
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify account status
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email before logging in' },
        { status: 403 }
      );
    }

    if (user.locked) {
      return NextResponse.json(
        { error: 'Account is locked. Please contact support.' },
        { status: 403 }
      );
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      // Update failed attempts
      await db.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: user.loginAttempts + 1,
          locked: user.loginAttempts >= 4 // Lock after 5 failed attempts
        }
      });

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Reset login attempts on successful login
    await db.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lastLogin: new Date()
      }
    });

    // Generate JWT with secure settings
    const token = await signJWT(
      { userId: user.id },
      { expiresIn: '1h' }
    );

    // Set secure cookie with token
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    console.error('[LOGIN_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
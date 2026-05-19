import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { signJWT } from '@/lib/jwt';
import { rateLimit } from '@/lib/rate-limit';
import { timingSafeEqual } from 'crypto';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const RESET_RATE_LIMIT = 3; // 3 attempts per 24h

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    // Rate limiting for login attempts
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = await rateLimit(ipAddress, 'login', MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

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

    // Check if account is locked
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockoutTime = new Date(user.lastFailedLogin!).getTime() + LOCKOUT_DURATION;
      if (Date.now() < lockoutTime) {
        return NextResponse.json(
          { error: 'Account is temporarily locked. Please try again later.' },
          { status: 423 }
        );
      }
      // Reset failed attempts if lockout period has passed
      await db.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0 }
      });
    }

    // Verify password using timing-safe comparison
    const passwordMatch = await bcrypt.compare(password, user.password);
    const isValid = timingSafeEqual(
      Buffer.from(passwordMatch.toString()),
      Buffer.from('true')
    );

    if (!isValid) {
      // Increment failed attempts
      await db.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: (user.failedLoginAttempts || 0) + 1,
          lastFailedLogin: new Date()
        }
      });

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Reset failed attempts on successful login
    await db.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0 }
    });

    // Generate JWT token
    const token = await signJWT(
      { userId: user.id },
      { exp: '1h' }
    );

    // Set secure cookie
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
    
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
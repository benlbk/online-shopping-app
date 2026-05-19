import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { randomBytes } from 'crypto';
import { sendResetEmail } from '@/lib/email';

const resetSchema = z.object({
  email: z.string().email()
});

const RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour
const RESET_RATE_LIMIT = 3; // 3 attempts per 24h
const RESET_RATE_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = resetSchema.parse(body);

    // Rate limiting for password reset requests
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = await rateLimit(
      ipAddress,
      'password-reset',
      RESET_RATE_LIMIT,
      RESET_RATE_WINDOW
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many reset attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Generate secure reset token
    const resetToken = randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 10);

    // Store reset token with expiry
    await db.user.update({
      where: { email: email.toLowerCase() },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: new Date(Date.now() + RESET_TOKEN_EXPIRY)
      }
    });

    // Send reset email
    await sendResetEmail(email, resetToken);

    return NextResponse.json({
      message: 'If an account exists with this email, a password reset link will be sent.'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';
import { sendVerificationEmail } from '@/lib/email';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one symbol'),
  name: z.string().min(2)
});

const VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name } = registerSchema.parse(body);

    // Check for existing user
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Generate secure verification token
    const verificationToken = randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(verificationToken, 10);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        verificationToken: hashedToken,
        verificationTokenExpiry: new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY),
        status: 'PENDING'
      }
    });

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    return NextResponse.json({
      userId: user.id,
      message: 'Registration successful. Please check your email to verify your account.'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
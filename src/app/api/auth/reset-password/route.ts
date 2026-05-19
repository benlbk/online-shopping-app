import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

const requestResetSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*[0-9])/)
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = requestResetSchema.parse(body);

    const user = await db.user.findUnique({
      where: { email: validatedData.email }
    });

    if (user) {
      const resetToken = crypto.randomUUID();
      await db.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000)
        }
      });

      await sendPasswordResetEmail({
        email: user.email,
        token: resetToken,
        name: user.name
      });
    }

    return NextResponse.json({
      message: 'If an account exists, a password reset email has been sent'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const validatedData = resetPasswordSchema.parse(body);

    const user = await db.user.findFirst({
      where: {
        resetToken: validatedData.token,
        resetTokenExpiry: { gt: new Date() }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    return NextResponse.json({
      message: 'Password reset successful'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

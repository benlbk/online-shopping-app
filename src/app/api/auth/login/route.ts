import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { signJWT } from '@/lib/jwt';
import { rateLimit } from '@/lib/rate-limit';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = loginSchema.parse(body);

    // Apply rate limiting
    const identifier = req.headers.get('x-forwarded-for') || 'unknown';
    const { success } = await rateLimit.check(identifier, 5, '15m');
    if (!success) {
      return NextResponse.json(
        { error: 'Too many login attempts' },
        { status: 429 }
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: validatedData.email }
    });

    if (!user || !user.verified) {
      return NextResponse.json(
        { error: 'Invalid credentials or unverified account' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(
      validatedData.password,
      user.password
    );

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT
    const token = await signJWT(
      { userId: user.id, email: user.email },
      { exp: '1h' }
    );

    return NextResponse.json({ token });

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

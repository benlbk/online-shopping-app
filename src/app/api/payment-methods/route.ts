import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

const paymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1),
  customerId: z.string().min(1)
});

// Rate limiting configuration
const RATE_LIMIT = 100; // requests per window
const RATE_WINDOW = 3600000; // 1 hour in ms
const requests = new Map();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_WINDOW;
  
  const userRequests = requests.get(ip) || [];
  const windowRequests = userRequests.filter(time => time > windowStart);
  
  if (windowRequests.length >= RATE_LIMIT) {
    return false;
  }
  
  windowRequests.push(now);
  requests.set(ip, windowRequests);
  return true;
}

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const ip = headers().get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Verify CSRF token
    const csrfToken = headers().get('x-csrf-token');
    if (!csrfToken || csrfToken !== session.csrfToken) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    const customerId = session.user.stripeCustomerId;
    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID not found' }, { status: 400 });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    const formattedMethods = paymentMethods.data.map(method => ({
      id: method.id,
      brand: method.card?.brand,
      last4: method.card?.last4,
      expMonth: method.card?.exp_month,
      expYear: method.card?.exp_year
    }));

    return NextResponse.json({ paymentMethods: formattedMethods });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const ip = headers().get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Verify CSRF token
    const csrfToken = headers().get('x-csrf-token');
    if (!csrfToken || csrfToken !== session.csrfToken) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = paymentMethodSchema.parse(body);
    const { paymentMethodId, customerId } = validatedData;

    // Verify customer ID matches authenticated user
    if (customerId !== session.user.stripeCustomerId) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 403 });
    }

    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    console.error('Error saving payment method:', error);
    return NextResponse.json(
      { error: 'Failed to save payment method' },
      { status: 500 }
    );
  }
}

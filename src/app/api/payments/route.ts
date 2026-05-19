import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  paymentMethodId: z.string().min(1),
  orderId: z.string().min(1)
});

// Rate limiting configuration
const RATE_LIMIT = 20; // requests per window
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
    const validatedData = paymentSchema.parse(body);
    const { amount, currency, paymentMethodId, orderId } = validatedData;

    // Verify order belongs to authenticated user
    const order = await getOrder(orderId);
    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 403 });
    }

    // Verify payment amount matches order amount
    if (order.amount !== amount) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method: paymentMethodId,
      confirm: true,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/order/confirmation`,
      metadata: {
        orderId,
        userId: session.user.id
      }
    });

    // Log successful payment
    await logPayment({
      orderId,
      userId: session.user.id,
      amount,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: 'Payment processing failed' },
      { status: 500 }
    );
  }
}

// Helper functions
async function getOrder(orderId: string) {
  // Implementation to fetch order details from database
  throw new Error('Not implemented');
}

async function logPayment(data: {
  orderId: string,
  userId: string,
  amount: number,
  paymentIntentId: string,
  status: string
}) {
  // Implementation to log payment details to database
  throw new Error('Not implemented');
}

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  paymentMethodId: z.string(),
  orderId: z.string()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = paymentSchema.parse(body);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: validatedData.amount,
      currency: validatedData.currency,
      payment_method: validatedData.paymentMethodId,
      confirm: true,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/confirm`
    });

    return NextResponse.json({
      transactionId: paymentIntent.id,
      status: paymentIntent.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payment data' }, { status: 400 });
    }
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: 'Payment processing failed' },
      { status: 500 }
    );
  }
}

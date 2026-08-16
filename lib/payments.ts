import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function createPaymentSession(input: {
  userId: string;
  amount: number;
  purpose?: string;
}) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  if (stripeKey) {
    // Minimal Stripe Checkout Session via REST (no SDK required)
    const price = process.env.STRIPE_PRICE_ID;
    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', `${appUrl}/?paid=1`);
    params.set('cancel_url', `${appUrl}/?paid=0`);
    if (price) {
      params.set('line_items[0][price]', price);
      params.set('line_items[0][quantity]', '1');
    } else {
      params.set('line_items[0][price_data][currency]', 'usd');
      params.set('line_items[0][price_data][product_data][name]', input.purpose || 'TadbirkorAI');
      params.set('line_items[0][price_data][unit_amount]', String(Math.max(100, Math.round(input.amount / 120)))); // rough UZS→cent demo
      params.set('line_items[0][quantity]', '1');
    }
    params.set('metadata[userId]', input.userId);

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    const data = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
    if (!res.ok || !data.id) {
      logger.error('stripe_session_failed', { message: data.error?.message });
      throw new Error(data.error?.message || 'Stripe session yaratilmadi');
    }
    const payment = await prisma.payment.create({
      data: {
        userId: input.userId,
        provider: 'stripe',
        amount: input.amount,
        purpose: input.purpose || 'subscription',
        status: 'pending',
        externalId: data.id,
        checkoutUrl: data.url || '',
      },
    });
    return payment;
  }

  // Local checkout (no card data collected here)
  const externalId = `local_${randomBytes(8).toString('hex')}`;
  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      provider: 'local',
      amount: input.amount,
      purpose: input.purpose || 'subscription',
      status: 'pending',
      externalId,
      checkoutUrl: `${appUrl}/api/payments/${externalId}/confirm`,
    },
  });
  return payment;
}

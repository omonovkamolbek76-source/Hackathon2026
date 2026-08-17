import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function createPaymentSession(input: {
  userId: string;
  amount: number;
  purpose?: string;
  /** 'UZS' (default, legacy so'm amounts) or 'USD' (amount is ALREADY in cents — subscription plans). */
  currency?: 'UZS' | 'USD';
}) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const currency = input.currency || 'UZS';

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
      // USD amounts are already in cents (e.g. subscription plan prices);
      // UZS amounts use a rough demo so'm→cent conversion for the legacy flow.
      const unitAmountCents = currency === 'USD' ? Math.max(50, Math.round(input.amount)) : Math.max(100, Math.round(input.amount / 120));
      params.set('line_items[0][price_data][currency]', currency.toLowerCase());
      params.set('line_items[0][price_data][product_data][name]', input.purpose || 'TadbirkorAI');
      params.set('line_items[0][price_data][unit_amount]', String(unitAmountCents));
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
        currency,
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
      currency,
      purpose: input.purpose || 'subscription',
      status: 'pending',
      externalId,
      checkoutUrl: `${appUrl}/api/payments/${externalId}/confirm`,
    },
  });
  return payment;
}

/**
 * Verifies a Stripe webhook signature per Stripe's documented scheme
 * (https://stripe.com/docs/webhooks#verify-manually), without requiring the
 * Stripe SDK: header is `t=<timestamp>,v1=<hex hmac>`; signed payload is
 * `${timestamp}.${rawBody}`; HMAC-SHA256 with the webhook signing secret.
 * Rejects requests older than `toleranceSec` to mitigate replay attacks.
 */
export function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSec = 5 * 60,
): boolean {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k, v];
    }),
  );
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSec) return false;

  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(v1, 'hex');
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

import { prisma } from '@/lib/db';
import { verifyStripeWebhookSignature } from '@/lib/payments';
import { activateSubscriptionFromPaidPayment } from '@/lib/subscription';
import { writeAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { jsonError, jsonOk } from '@/lib/api';

/**
 * Stripe Checkout webhook — the ONLY way a `stripe` provider payment can
 * transition to `paid`. Signature is verified against STRIPE_WEBHOOK_SECRET
 * before any DB write; unsigned or invalid requests are rejected outright.
 * This route is intentionally unauthenticated (Stripe cannot send our session
 * cookie) — trust is established purely via HMAC signature verification.
 */
export async function POST(request: Request) {
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      logger.warn('stripe_webhook_received_but_not_configured');
      return jsonError('Webhook sozlanmagan', 501);
    }

    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');
    if (!verifyStripeWebhookSignature(rawBody, signature, secret)) {
      logger.warn('stripe_webhook_invalid_signature');
      return jsonError('Noto‘g‘ri imzo', 400);
    }

    let event: { type?: string; data?: { object?: Record<string, unknown> } };
    try {
      event = JSON.parse(rawBody);
    } catch {
      return jsonError('Noto‘g‘ri JSON', 400);
    }

    const type = event.type;
    const obj = event.data?.object || {};
    const sessionId = typeof obj.id === 'string' ? obj.id : undefined;

    if (type === 'checkout.session.completed' || type === 'checkout.session.async_payment_succeeded') {
      if (!sessionId) return jsonOk({ received: true });
      const payment = await prisma.payment.findFirst({
        where: { externalId: sessionId, provider: 'stripe' },
      });
      if (!payment) {
        logger.warn('stripe_webhook_unknown_session', { sessionId });
        return jsonOk({ received: true });
      }
      if (payment.status !== 'paid') {
        const updated = await prisma.payment.update({ where: { id: payment.id }, data: { status: 'paid' } });
        await writeAudit({ userId: payment.userId, action: 'payment.paid_stripe', meta: { id: payment.id, sessionId } });
        await activateSubscriptionFromPaidPayment(updated);
        await prisma.notification.create({
          data: {
            userId: payment.userId,
            title: 'To‘lov qabul qilindi',
            body: `Summa: ${payment.amount.toLocaleString('uz-UZ')} so‘m (Stripe).`,
            kind: 'payment',
          },
        });
      }
    } else if (type === 'checkout.session.expired' || type === 'checkout.session.async_payment_failed') {
      if (sessionId) {
        const payment = await prisma.payment.findFirst({ where: { externalId: sessionId, provider: 'stripe' } });
        if (payment && payment.status === 'pending') {
          await prisma.payment.update({ where: { id: payment.id }, data: { status: 'failed' } });
          await writeAudit({ userId: payment.userId, action: 'payment.failed_stripe', meta: { id: payment.id, sessionId } });
        }
      }
    }

    return jsonOk({ received: true });
  } catch (e) {
    logger.error('stripe_webhook_error', { message: e instanceof Error ? e.message : 'unknown' });
    return jsonError('Server xatosi', 500);
  }
}

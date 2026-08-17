import { z } from 'zod';
import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createPaymentSession } from '@/lib/payments';
import { subscriptionPurpose } from '@/lib/subscription';
import { writeAudit } from '@/lib/audit';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { jsonError, jsonOk } from '@/lib/api';
import { logger } from '@/lib/logger';

const schema = z.object({
  planKey: z.enum(['FREE', 'BUSINESS', 'BUSINESS_PRO', 'FINANCIAL', 'FINANCIAL_PRO']),
});

/**
 * POST /api/subscription/checkout — reuses the existing payment abstraction
 * (lib/payments.ts, local demo or Stripe) rather than a parallel billing
 * system. Activation happens when the resulting Payment is confirmed paid —
 * see lib/subscription.ts:activateSubscriptionFromPaidPayment, wired into
 * both the local confirm route and the Stripe webhook.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(clientKey(request, `sub-checkout:${user.id}`), 10, 60_000);
    if (!rl.ok) return jsonError('Juda ko\u2018p so\u2018rov', 429);

    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError('Validatsiya xatosi', 400);

    if (parsed.data.planKey === 'FREE') {
      return jsonError('Free reja uchun to\u2018lov kerak emas', 400);
    }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { key: parsed.data.planKey } });
    if (!plan || !plan.active) return jsonError('Reja topilmadi', 404);

    const payment = await createPaymentSession({
      userId: user.id,
      amount: plan.priceCents,
      currency: 'USD',
      purpose: subscriptionPurpose(plan.key),
    });

    await writeAudit({
      userId: user.id,
      action: 'subscription.checkout_started',
      meta: { planKey: plan.key, provider: payment.provider, paymentId: payment.id },
    });

    return jsonOk({ payment }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    logger.error('subscription_checkout_failed', { message: e instanceof Error ? e.message : 'unknown' });
    return jsonError('To\u2018lov yaratib bo\u2018lmadi. Keyinroq qayta urinib ko\u2018ring.', 500);
  }
}

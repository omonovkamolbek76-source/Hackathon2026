import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { SubscriptionPlan } from '@prisma/client';

const SUBSCRIPTION_PURPOSE_PREFIX = 'subscription:';
const SUBSCRIPTION_PERIOD_DAYS = 30;

export function subscriptionPurpose(planKey: string): string {
  return `${SUBSCRIPTION_PURPOSE_PREFIX}${planKey}`;
}

export function planKeyFromPurpose(purpose: string): string | null {
  return purpose.startsWith(SUBSCRIPTION_PURPOSE_PREFIX) ? purpose.slice(SUBSCRIPTION_PURPOSE_PREFIX.length) : null;
}

/**
 * Called after a Payment transitions to `paid` (from either the local
 * confirm route or the Stripe webhook — see lib/payments.ts callers).
 * Activates or renews the user's subscription for the plan encoded in
 * `payment.purpose`. No-ops for regular (non-subscription) payments.
 */
export async function activateSubscriptionFromPaidPayment(payment: {
  id: string;
  userId: string;
  purpose: string;
  provider: string;
}) {
  const planKey = planKeyFromPurpose(payment.purpose);
  if (!planKey) return null;

  const plan = await prisma.subscriptionPlan.findUnique({ where: { key: planKey } });
  if (!plan || !plan.active) {
    logger.warn('subscription_activation_unknown_plan', { planKey });
    return null;
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + SUBSCRIPTION_PERIOD_DAYS);

  const existing = await prisma.subscription.findFirst({
    where: { userId: payment.userId, status: { in: ['active', 'trialing'] } },
  });

  if (existing) {
    return prisma.subscription.update({
      where: { id: existing.id },
      data: {
        planId: plan.id,
        status: 'active',
        provider: payment.provider,
        providerRef: payment.id,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
    });
  }

  return prisma.subscription.create({
    data: {
      userId: payment.userId,
      planId: plan.id,
      status: 'active',
      provider: payment.provider,
      providerRef: payment.id,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });
}

/**
 * Returns the user's active/trialing subscription (with plan), lazily
 * expiring it if its period has passed. A production deployment should also
 * expire subscriptions proactively via a scheduled job / provider webhook;
 * this lazy check is the v1 safety net so entitlement checks never grant
 * access past the paid period even if that job hasn't run yet.
 */
export async function getActiveSubscriptionWithPlan(userId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ['active', 'trialing'] } },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!sub) return null;
  if (sub.currentPeriodEnd.getTime() < Date.now()) {
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'expired' } });
    return null;
  }
  return sub;
}

export async function getEffectivePlan(userId: string): Promise<SubscriptionPlan | null> {
  const sub = await getActiveSubscriptionWithPlan(userId);
  if (sub) return sub.plan;
  return prisma.subscriptionPlan.findUnique({ where: { key: 'FREE' } });
}

export async function cancelSubscription(userId: string) {
  const sub = await prisma.subscription.findFirst({ where: { userId, status: { in: ['active', 'trialing'] } } });
  if (!sub) return null;
  return prisma.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: true } });
}

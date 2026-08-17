import { AuthError, requireUser } from '@/lib/auth';
import { cancelSubscription, getActiveSubscriptionWithPlan, getEffectivePlan } from '@/lib/subscription';
import { getTodayAiUsage } from '@/lib/entitlements';
import { writeAudit } from '@/lib/audit';
import { jsonError, jsonOk } from '@/lib/api';

function parseFeatures(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** GET: the current user's subscription status, effective plan, and today's AI usage. */
export async function GET() {
  try {
    const user = await requireUser();
    const [sub, plan, messagesToday] = await Promise.all([
      getActiveSubscriptionWithPlan(user.id),
      getEffectivePlan(user.id),
      getTodayAiUsage(user.id),
    ]);

    return jsonOk({
      subscription: sub
        ? {
            status: sub.status,
            currentPeriodEnd: sub.currentPeriodEnd,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
            planKey: sub.plan.key,
          }
        : null,
      plan: plan
        ? {
            key: plan.key,
            name: plan.name,
            priceCents: plan.priceCents,
            currency: plan.currency,
            interval: plan.interval,
            features: parseFeatures(plan.features),
            aiMessagesPerDay: plan.aiMessagesPerDay,
            voiceMinutesPerDay: plan.voiceMinutesPerDay,
            financialAnalysis: plan.financialAnalysis,
            prioritySupport: plan.prioritySupport,
          }
        : null,
      usage: { messagesToday },
    });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

/** DELETE: cancel at period end (does not immediately revoke access — matches typical SaaS UX). */
export async function DELETE() {
  try {
    const user = await requireUser();
    const sub = await cancelSubscription(user.id);
    if (!sub) return jsonError('Faol obuna topilmadi', 404);
    await writeAudit({ userId: user.id, action: 'subscription.cancel_requested' });
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
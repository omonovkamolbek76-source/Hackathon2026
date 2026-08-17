import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { jsonError, jsonOk } from '@/lib/api';

function parseFeatures(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/**
 * GET /api/subscription/plans — public plan catalog. Prices/features/limits
 * come entirely from the SubscriptionPlan table (seeded, adjustable without a
 * code change) — nothing here is hardcoded.
 */
export async function GET() {
  try {
    await requireUser();
    const plans = await prisma.subscriptionPlan.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
    return jsonOk({
      plans: plans.map((p) => ({
        key: p.key,
        name: p.name,
        priceCents: p.priceCents,
        currency: p.currency,
        interval: p.interval,
        features: parseFeatures(p.features),
        aiMessagesPerDay: p.aiMessagesPerDay,
        voiceMinutesPerDay: p.voiceMinutesPerDay,
        financialAnalysis: p.financialAnalysis,
        prioritySupport: p.prioritySupport,
      })),
    });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

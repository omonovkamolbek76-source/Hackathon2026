import { prisma } from '@/lib/db';
import { getEffectivePlan } from '@/lib/subscription';
import type { SubscriptionPlan } from '@prisma/client';

/**
 * Backend-enforced subscription entitlements (section 38-40). The frontend
 * may also hide/disable buttons for a lower plan, but that is UX only — every
 * gated capability MUST be re-checked here, server-side, on every request.
 * `POST /api/coach` with a Free-plan session cannot exceed its AI quota no
 * matter what the client sends.
 */

export class EntitlementError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getTodayAiUsage(userId: string): Promise<number> {
  const usage = await prisma.aiUsageDaily.findUnique({ where: { userId_day: { userId, day: todayUtc() } } });
  return usage?.messages || 0;
}

/** Throws EntitlementError (429) if the user's plan quota for today is exhausted. */
export async function requireAiQuota(userId: string): Promise<SubscriptionPlan> {
  const plan = await getEffectivePlan(userId);
  if (!plan) throw new EntitlementError('Reja topilmadi', 500);

  const used = await getTodayAiUsage(userId);
  if (used >= plan.aiMessagesPerDay) {
    throw new EntitlementError(
      `Joriy reja (${plan.name}) uchun kunlik AI limiti tugadi. Ko\u2018proq foydalanish uchun rejangizni yangilang.`,
      429,
    );
  }
  return plan;
}

export async function consumeAiQuota(userId: string): Promise<void> {
  const day = todayUtc();
  await prisma.aiUsageDaily.upsert({
    where: { userId_day: { userId, day } },
    update: { messages: { increment: 1 } },
    create: { userId, day, messages: 1 },
  });
}

/** Throws EntitlementError (403) unless the user's plan includes financial analysis. */
export async function requireFinancialEntitlement(userId: string): Promise<SubscriptionPlan> {
  const plan = await getEffectivePlan(userId);
  if (!plan?.financialAnalysis) {
    throw new EntitlementError('Bu funksiya Financial reja va undan yuqorisida mavjud. Rejangizni yangilang.', 403);
  }
  return plan;
}

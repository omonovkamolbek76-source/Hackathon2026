import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { requireAiQuota, consumeAiQuota, requireFinancialEntitlement, EntitlementError, getTodayAiUsage } from '@/lib/entitlements';
import { activateSubscriptionFromPaidPayment, getEffectivePlan, subscriptionPurpose } from '@/lib/subscription';

/**
 * These tests exercise the real Prisma/SQLite dev database (same one
 * `npm run db:setup` prepares) rather than mocking the ORM — entitlement and
 * quota enforcement is exactly the kind of logic where a mocked DB could
 * hide a real bug (e.g. an unfiltered query returning another user's usage).
 * Each test creates its own uniquely-emailed user and cleans up after itself.
 */

let testUserId: string;
let quotaPlanKey: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      email: `entitlement-test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
      passwordHash: 'not-a-real-hash',
      name: 'Entitlement Test User',
    },
  });
  testUserId = user.id;

  // A tiny, isolated plan so the quota test doesn't depend on seeded FREE's limit.
  quotaPlanKey = `TEST_QUOTA_${Date.now()}`;
  await prisma.subscriptionPlan.create({
    data: {
      key: quotaPlanKey,
      name: 'Test Quota Plan',
      priceCents: 0,
      aiMessagesPerDay: 2,
      voiceMinutesPerDay: 0,
      financialAnalysis: false,
    },
  });
});

afterAll(async () => {
  await prisma.aiUsageDaily.deleteMany({ where: { userId: testUserId } });
  await prisma.subscription.deleteMany({ where: { userId: testUserId } });
  await prisma.user.delete({ where: { id: testUserId } }).catch(() => undefined);
  await prisma.subscriptionPlan.deleteMany({ where: { key: quotaPlanKey } });
});

describe('Backend-enforced AI quota (subscription-gated, never a frontend-only limit)', () => {
  it('defaults an unsubscribed user to the FREE plan', async () => {
    const plan = await getEffectivePlan(testUserId);
    expect(plan?.key).toBe('FREE');
  });

  it('blocks financial-analysis features on a plan without that entitlement', async () => {
    await expect(requireFinancialEntitlement(testUserId)).rejects.toThrow(EntitlementError);
  });

  it('activating a paid Financial-tier subscription unlocks financial entitlement', async () => {
    const payment = await prisma.payment.create({
      data: {
        userId: testUserId,
        provider: 'local',
        amount: 1500,
        currency: 'USD',
        purpose: subscriptionPurpose('FINANCIAL'),
        status: 'paid',
      },
    });

    await activateSubscriptionFromPaidPayment(payment);

    const plan = await requireFinancialEntitlement(testUserId);
    expect(plan.key).toBe('FINANCIAL');

    const effective = await getEffectivePlan(testUserId);
    expect(effective?.key).toBe('FINANCIAL');
  });

  it('enforces the daily message quota strictly (blocks the request that would exceed it)', async () => {
    // Move this user onto the tiny 2-message test plan.
    const testPlan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { key: quotaPlanKey } });
    const payment = await prisma.payment.create({
      data: {
        userId: testUserId,
        provider: 'local',
        amount: 0,
        currency: 'USD',
        purpose: subscriptionPurpose(quotaPlanKey),
        status: 'paid',
      },
    });
    await activateSubscriptionFromPaidPayment(payment);

    const plan1 = await requireAiQuota(testUserId);
    expect(plan1.key).toBe(quotaPlanKey);
    await consumeAiQuota(testUserId);
    expect(await getTodayAiUsage(testUserId)).toBe(1);

    await requireAiQuota(testUserId); // second message still within quota (limit=2)
    await consumeAiQuota(testUserId);
    expect(await getTodayAiUsage(testUserId)).toBe(2);

    await expect(requireAiQuota(testUserId)).rejects.toThrow(EntitlementError);
    expect(testPlan.aiMessagesPerDay).toBe(2);
  });

  it('never leaks another user\u2019s usage or plan (per-user isolation)', async () => {
    const other = await prisma.user.create({
      data: {
        email: `entitlement-isolation-${Date.now()}@test.local`,
        passwordHash: 'not-a-real-hash',
        name: 'Isolation Test User',
      },
    });
    try {
      const otherUsage = await getTodayAiUsage(other.id);
      expect(otherUsage).toBe(0); // must not see the primary test user's consumed quota
      const otherPlan = await getEffectivePlan(other.id);
      expect(otherPlan?.key).toBe('FREE'); // must not inherit the primary test user's FINANCIAL plan
    } finally {
      await prisma.user.delete({ where: { id: other.id } }).catch(() => undefined);
    }
  });
});

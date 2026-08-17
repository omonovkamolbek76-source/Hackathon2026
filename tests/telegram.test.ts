import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { sendTelegramMessage, isTelegramConfigured, TelegramError } from '@/lib/telegram/client';
import { createTelegramLinkToken, consumeLinkToken } from '@/lib/telegram/link';
import {
  getTaskReminderCandidates,
  getDeadlineReminderCandidates,
  getFinancialUpdateCandidates,
  getBusinessUpdateCandidates,
  getApplicationUpdateCandidates,
  getSubscriptionUpdateCandidates,
  getSystemNotificationCandidates,
  getXReportCandidates,
  getZReportCandidates,
  getPaymentsDueCandidates,
  getSwotDigestCandidates,
} from '@/lib/telegram/events';
import { processUserNotifications } from '@/lib/telegram/checker';

const ORIGINAL_ENV = { ...process.env };

describe('Telegram client — configuration and error classification (network mocked)', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it('reports not configured without a bot token', () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    expect(isTelegramConfigured()).toBe(false);
  });

  it('reports configured once a bot token is set', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    expect(isTelegramConfigured()).toBe(true);
  });

  it('sends a plain-text message via the Bot API', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    let capturedUrl = '';
    let capturedBody: Record<string, unknown> = {};
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        capturedUrl = String(url);
        capturedBody = JSON.parse(String(init.body));
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }),
    );

    await sendTelegramMessage('12345', 'Salom!');
    expect(capturedUrl).toContain('test-token');
    expect(capturedUrl).toContain('/sendMessage');
    expect(capturedBody.chat_id).toBe('12345');
    expect(capturedBody.text).toBe('Salom!');
  });

  it('classifies a "blocked by the user" API error', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ ok: false, description: 'Forbidden: bot was blocked by the user' }), { status: 403 }),
      ),
    );
    await expect(sendTelegramMessage('12345', 'hi')).rejects.toMatchObject({ kind: 'blocked' } satisfies Partial<TelegramError>);
  });

  it('classifies a "chat not found" API error', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ ok: false, description: 'Bad Request: chat not found' }), { status: 400 })),
    );
    await expect(sendTelegramMessage('12345', 'hi')).rejects.toMatchObject({ kind: 'chat_not_found' });
  });

  it('throws before any network call when no token is configured', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(sendTelegramMessage('12345', 'hi')).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('Telegram link tokens — single-use, short-lived, unguessable', () => {
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `telegram-link-test-${Date.now()}@test.local`,
        passwordHash: 'not-a-real-hash',
        name: 'Link Token Test User',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.telegramLinkToken.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  });

  it('generates unique tokens each time', async () => {
    const a = await createTelegramLinkToken(userId);
    const b = await createTelegramLinkToken(userId);
    expect(a.token).not.toBe(b.token);
    expect(a.token.length).toBeGreaterThan(16);
  });

  it('consumes a valid token exactly once', async () => {
    const { token } = await createTelegramLinkToken(userId);
    const first = await consumeLinkToken(token);
    expect(first).toEqual({ ok: true, userId });

    const second = await consumeLinkToken(token);
    expect(second).toEqual({ ok: false, reason: 'already_used' });
  });

  it('rejects an unknown token', async () => {
    const result = await consumeLinkToken('this-token-does-not-exist');
    expect(result).toEqual({ ok: false, reason: 'not_found' });
  });

  it('rejects an expired token', async () => {
    const { token } = await createTelegramLinkToken(userId);
    await prisma.telegramLinkToken.update({
      where: { token },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const result = await consumeLinkToken(token);
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });
});

describe('Telegram notification events — platform data only, per-user isolation', () => {
  let userA: string;
  let userB: string;

  beforeAll(async () => {
    const a = await prisma.user.create({
      data: { email: `telegram-events-a-${Date.now()}@test.local`, passwordHash: 'x', name: 'User A' },
    });
    const b = await prisma.user.create({
      data: { email: `telegram-events-b-${Date.now()}@test.local`, passwordHash: 'x', name: 'User B' },
    });
    userA = a.id;
    userB = b.id;

    await prisma.task.create({
      data: { userId: userA, title: 'Supplier bilan gaplashish', status: 'today', category: 'supply' },
    });
    await prisma.task.create({
      data: { userId: userA, title: 'Soliq hisobotini topshirish', status: 'overdue', category: 'tax', dueDate: 'Kecha' },
    });
    await prisma.task.create({
      data: { userId: userB, title: 'Marketing rejasini tayyorlash', status: 'today', category: 'marketing' },
    });

    await prisma.transaction.create({
      data: { userId: userA, title: 'Elektr energiyasi', amount: 500_000, type: 'expense', category: 'utilities' },
    });

    await prisma.businessPlan.create({
      data: {
        userId: userA,
        businessName: 'Eco Trade',
        targetAudience: 'x',
        budget: 1000,
        description: 'x',
        concept: 'x',
        marketOpportunity: 'x',
        competitors: 'x',
        marketingPlan: 'x',
        operationalPlan: 'x',
        financialPlan: 'x',
        expenses: 'x',
        expectedRevenue: 'x',
        breakeven: 'x',
        nextSteps: 'x',
      },
    });

    await prisma.creditApplication.create({
      data: { userId: userA, answers: '{}', results: '{}' },
    });

    await prisma.notification.create({
      data: { userId: userA, title: 'MFA yoqildi', body: 'Hisobingiz himoyalandi.', kind: 'security' },
    });
  });

  afterAll(async () => {
    for (const userId of [userA, userB]) {
      await prisma.telegramNotification.deleteMany({ where: { userId } });
      await prisma.task.deleteMany({ where: { userId } });
      await prisma.transaction.deleteMany({ where: { userId } });
      await prisma.businessPlan.deleteMany({ where: { userId } });
      await prisma.creditApplication.deleteMany({ where: { userId } });
      await prisma.notification.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    }
  });

  it('TASK_REMINDER uses the exact task title stored in the DB, nothing invented', async () => {
    const candidates = await getTaskReminderCandidates(userA);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].message).toContain('Supplier bilan gaplashish');
    expect(candidates[0].eventId).toMatch(/^task:.+:today$/);
  });

  it('DEADLINE_REMINDER only includes overdue tasks', async () => {
    const candidates = await getDeadlineReminderCandidates(userA);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].message).toContain('Soliq hisobotini topshirish');
    expect(candidates[0].eventId).toMatch(/^task:.+:overdue$/);
  });

  it('FINANCIAL_UPDATE reflects the exact stored amount and title (no analysis/opinion)', async () => {
    const candidates = await getFinancialUpdateCandidates(userA);
    expect(candidates).toHaveLength(1);
    const expectedAmount = (500_000).toLocaleString('uz-UZ');
    expect(candidates[0].message).toBe(`Elektr energiyasi: ${expectedAmount} so\u2018m`);
    expect(candidates[0].type).toBe('FINANCIAL_UPDATE');
  });

  it('BUSINESS_UPDATE reflects the business plan\u2019s stored name', async () => {
    const candidates = await getBusinessUpdateCandidates(userA);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].message).toContain('Eco Trade');
  });

  it('APPLICATION_UPDATE fires for a stored credit application', async () => {
    const candidates = await getApplicationUpdateCandidates(userA);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].type).toBe('APPLICATION_UPDATE');
  });

  it('SYSTEM_NOTIFICATION mirrors an existing in-app notification verbatim', async () => {
    const candidates = await getSystemNotificationCandidates(userA);
    expect(candidates.some((c) => c.message === 'Hisobingiz himoyalandi.')).toBe(true);
  });

  it('never returns another user\u2019s data (strict per-user isolation)', async () => {
    const aTasks = await getTaskReminderCandidates(userA);
    const bTasks = await getTaskReminderCandidates(userB);
    expect(aTasks.some((c) => c.message.includes('Marketing rejasini tayyorlash'))).toBe(false);
    expect(bTasks.some((c) => c.message.includes('Supplier bilan gaplashish'))).toBe(false);
    expect(bTasks).toHaveLength(1);
    expect(bTasks[0].message).toContain('Marketing rejasini tayyorlash');
  });

  it('returns no financial/business candidates for a user with no such records', async () => {
    expect(await getFinancialUpdateCandidates(userB)).toHaveLength(0);
    expect(await getBusinessUpdateCandidates(userB)).toHaveLength(0);
    expect(await getApplicationUpdateCandidates(userB)).toHaveLength(0);
  });

  it('subscription candidates are empty with no active subscription (never invents one)', async () => {
    expect(await getSubscriptionUpdateCandidates(userA)).toHaveLength(0);
  });
});

describe('Telegram checker — duplicate protection, settings, blocked handling (network mocked)', () => {
  let userId: string;
  const chatId = `test-chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  beforeAll(async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    const user = await prisma.user.create({
      data: { email: `telegram-checker-${Date.now()}@test.local`, passwordHash: 'x', name: 'Checker Test User' },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.telegramNotification.deleteMany({ where: { userId } });
    await prisma.notificationSettings.deleteMany({ where: { userId } });
    await prisma.task.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends a new event exactly once even across repeated checker runs (idempotency)', async () => {
    await prisma.task.create({ data: { userId, title: 'Dedup test task', status: 'today', category: 'planning' } });

    let sendCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        sendCount++;
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }),
    );

    const first = await processUserNotifications(userId, chatId);
    expect(first.sent).toBe(1);

    const second = await processUserNotifications(userId, chatId);
    expect(second.sent).toBe(0);
    expect(second.skipped).toBeGreaterThanOrEqual(1);

    expect(sendCount).toBe(1); // Telegram API was only actually called once
  });

  it('respects a disabled notification category (no send, no DB row created)', async () => {
    await prisma.notificationSettings.upsert({
      where: { userId },
      update: { taskNotifications: false },
      create: { userId, taskNotifications: false },
    });
    await prisma.task.create({ data: { userId, title: 'Should be suppressed', status: 'today', category: 'planning' } });

    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await processUserNotifications(userId, chatId);
    expect(fetchSpy).not.toHaveBeenCalled();

    const row = await prisma.telegramNotification.findFirst({
      where: { userId, title: { contains: 'Bugungi vazifa' }, message: { contains: 'Should be suppressed' } },
    });
    expect(row).toBeNull();

    await prisma.notificationSettings.update({ where: { userId }, data: { taskNotifications: true } });
  });

  it('respects the master telegramEnabled switch (suppresses every category)', async () => {
    await prisma.notificationSettings.update({ where: { userId }, data: { telegramEnabled: false } });
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await processUserNotifications(userId, chatId);
    expect(result).toEqual({ sent: 0, skipped: 0, failed: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();

    await prisma.notificationSettings.update({ where: { userId }, data: { telegramEnabled: true } });
  });

  it('marks the connection blocked when Telegram reports the bot was blocked', async () => {
    await prisma.telegramConnection.create({ data: { userId, telegramChatId: chatId, status: 'active' } });
    await prisma.task.create({ data: { userId, title: 'Blocked-path task', status: 'today', category: 'planning' } });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ ok: false, description: 'Forbidden: bot was blocked by the user' }), { status: 403 }),
      ),
    );

    const result = await processUserNotifications(userId, chatId);
    expect(result.failed).toBeGreaterThanOrEqual(1);

    const connection = await prisma.telegramConnection.findUnique({ where: { userId } });
    expect(connection?.status).toBe('blocked');

    await prisma.telegramConnection.deleteMany({ where: { userId } });
  });

  it('gives up after the max attempt cap instead of retrying forever', async () => {
    await prisma.task.create({ data: { userId, title: 'Always-fails task', status: 'today', category: 'planning' } });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ ok: false, description: 'Internal Server Error' }), { status: 500 })),
    );

    // Attempt several times in a row (simulating several checker ticks).
    for (let i = 0; i < 5; i++) {
      await processUserNotifications(userId, chatId);
    }

    const row = await prisma.telegramNotification.findFirst({
      where: { userId, message: { contains: 'Always-fails task' } },
    });
    expect(row).not.toBeNull();
    expect(row!.attempts).toBeLessThanOrEqual(3); // MAX_SEND_ATTEMPTS
    expect(row!.status).toBe('failed');
  });
});

describe('Telegram daily X/Z/SWOT/payments — platform data only', () => {
  let userA: string;
  let userB: string;
  const afternoon = new Date(Date.UTC(2026, 7, 17, 9, 0, 0)); // 14:00 Tashkent
  const evening = new Date(Date.UTC(2026, 7, 17, 16, 0, 0)); // 21:00 Tashkent
  const yesterday = new Date(Date.UTC(2026, 7, 16, 10, 0, 0));

  beforeAll(async () => {
    const a = await prisma.user.create({
      data: { email: `telegram-reports-a-${Date.now()}@test.local`, passwordHash: 'x', name: 'Reports A' },
    });
    const b = await prisma.user.create({
      data: { email: `telegram-reports-b-${Date.now()}@test.local`, passwordHash: 'x', name: 'Reports B' },
    });
    userA = a.id;
    userB = b.id;

    await prisma.transaction.create({
      data: {
        userId: userA,
        title: 'Bugungi savdo',
        amount: 1_250_000,
        type: 'income',
        category: 'sales',
        occurredAt: afternoon,
      },
    });
    await prisma.transaction.create({
      data: {
        userId: userA,
        title: 'Yetkazib berish',
        amount: 200_000,
        type: 'expense',
        category: 'logistics',
        occurredAt: afternoon,
      },
    });
    await prisma.transaction.create({
      data: {
        userId: userA,
        title: 'Kecha savdo',
        amount: 9_999_999,
        type: 'income',
        category: 'sales',
        occurredAt: yesterday,
      },
    });
    await prisma.transaction.create({
      data: {
        userId: userB,
        title: 'Boshqa foydalanuvchi savdosi',
        amount: 777_000,
        type: 'income',
        occurredAt: afternoon,
      },
    });
    await prisma.businessPlan.create({
      data: {
        userId: userA,
        businessName: 'Green Shop',
        targetAudience: 'oilalar',
        budget: 20_000_000,
        description: 'Organik mahsulot yetkazib berish',
        concept: 'c',
        marketOpportunity: 'm',
        competitors: 'r',
        marketingPlan: 'k',
        operationalPlan: 'o',
        financialPlan: 'f',
        expenses: 'e',
        expectedRevenue: 'd',
        breakeven: 'b',
        nextSteps: '[]',
      },
    });
    await prisma.task.create({
      data: { userId: userA, title: 'Soliq to‘lash', status: 'overdue', category: 'tax', dueDate: 'Kecha' },
    });
    await prisma.payment.create({
      data: { userId: userA, amount: 50_000, purpose: 'Obuna', status: 'pending', currency: 'UZS' },
    });
  });

  afterAll(async () => {
    for (const userId of [userA, userB]) {
      await prisma.telegramNotification.deleteMany({ where: { userId } });
      await prisma.transaction.deleteMany({ where: { userId } });
      await prisma.businessPlan.deleteMany({ where: { userId } });
      await prisma.task.deleteMany({ where: { userId } });
      await prisma.payment.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    }
  });

  it('X-hisobot uses today totals and ignores yesterday and other users', async () => {
    const candidates = await getXReportCandidates(userA, afternoon);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].eventId).toBe('x-report:2026-08-17');
    expect(candidates[0].message).toContain((1_250_000).toLocaleString('uz-UZ'));
    expect(candidates[0].message).toContain((200_000).toLocaleString('uz-UZ'));
    expect(candidates[0].message).not.toContain((9_999_999).toLocaleString('uz-UZ'));
    expect(candidates[0].message).not.toContain((777_000).toLocaleString('uz-UZ'));
  });

  it('does not emit X-hisobot when the user has no today transactions', async () => {
    const emptyUser = await prisma.user.create({
      data: { email: `telegram-reports-empty-${Date.now()}@test.local`, passwordHash: 'x', name: 'Empty' },
    });
    expect(await getXReportCandidates(emptyUser.id, afternoon)).toHaveLength(0);
    expect(await getZReportCandidates(emptyUser.id, evening)).toHaveLength(0);
    await prisma.user.delete({ where: { id: emptyUser.id } });
  });

  it('Z-hisobot is withheld before 20:00 Tashkent and emitted after', async () => {
    expect(await getZReportCandidates(userA, afternoon)).toHaveLength(0);
    const z = await getZReportCandidates(userA, evening);
    expect(z).toHaveLength(1);
    expect(z[0].eventId).toBe('z-report:2026-08-17');
    expect(z[0].message).toContain('Z-hisobot');
    expect(z[0].message).toContain((1_250_000).toLocaleString('uz-UZ'));
  });

  it('payments-due lists overdue tax tasks and pending payments, not another user', async () => {
    const a = await getPaymentsDueCandidates(userA, afternoon);
    expect(a).toHaveLength(1);
    expect(a[0].message).toContain('Soliq to‘lash');
    expect(a[0].message).toContain('Obuna');
    expect(await getPaymentsDueCandidates(userB, afternoon)).toHaveLength(0);
  });

  it('daily SWOT is derived from the stored plan name and never invents a competitor brand', async () => {
    const a = await getSwotDigestCandidates(userA, afternoon);
    expect(a).toHaveLength(1);
    expect(a[0].eventId).toMatch(/^swot:.+:2026-08-17$/);
    expect(a[0].message).toContain('Green Shop');
    expect(a[0].message).toContain('SWOT');
    expect(await getSwotDigestCandidates(userB, afternoon)).toHaveLength(0);
  });
});


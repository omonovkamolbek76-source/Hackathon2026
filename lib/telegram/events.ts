import { prisma } from '@/lib/db';
import { formatTopicDigest, parseSurveyAnswers } from '@/lib/survey';
import {
  formatPaymentsDue,
  formatSwotDigest,
  formatXReport,
  formatZReport,
  getDailyLedger,
  getLatestPlan,
  getPaymentsDue,
  tashkentDayKey,
} from '@/lib/reports/platform';

/**
 * Derives Telegram notification CANDIDATES strictly from data that already
 * exists in the platform's own database. No AI, no external calls, no
 * invented content — every field in every message below is copied verbatim
 * (or trivially formatted, e.g. a number->locale string) from an existing
 * row the user's own account already owns.
 *
 * Each candidate carries an `eventId` scoped to its SOURCE record, which the
 * checker (lib/telegram/checker.ts) uses as an idempotency key so the same
 * underlying event is never pushed twice.
 */

export type NotificationType =
  | 'TASK_REMINDER'
  | 'DEADLINE_REMINDER'
  | 'FINANCIAL_UPDATE'
  | 'BUSINESS_UPDATE'
  | 'APPLICATION_UPDATE'
  | 'SUBSCRIPTION_UPDATE'
  | 'SYSTEM_NOTIFICATION';

export type NotificationCandidate = {
  type: NotificationType;
  eventId: string;
  title: string;
  message: string;
};

// Bounds how much of any one table a single check pass reads per user —
// keeps the checker's queries small and predictable (section 9/29), not a
// full-table scan.
const RECENT_LIMIT = 20;
const SUBSCRIPTION_EXPIRING_WINDOW_DAYS = 3;

export async function getTaskReminderCandidates(userId: string): Promise<NotificationCandidate[]> {
  const tasks = await prisma.task.findMany({
    where: { userId, completed: false, status: 'today' },
    select: { id: true, title: true, subtitle: true },
    take: RECENT_LIMIT,
  });
  return tasks.map((t) => ({
    type: 'TASK_REMINDER' as const,
    eventId: `task:${t.id}:today`,
    title: '\u{1F4C5} Bugungi vazifa',
    message: t.subtitle ? `${t.title}\n${t.subtitle}` : t.title,
  }));
}

export async function getDeadlineReminderCandidates(userId: string): Promise<NotificationCandidate[]> {
  const tasks = await prisma.task.findMany({
    where: { userId, completed: false, status: 'overdue' },
    select: { id: true, title: true, dueDate: true },
    take: RECENT_LIMIT,
  });
  return tasks.map((t) => ({
    type: 'DEADLINE_REMINDER' as const,
    eventId: `task:${t.id}:overdue`,
    title: '\u23F0 Kechiktirilgan vazifa',
    message: t.dueDate ? `${t.title}\nMuddat: ${t.dueDate}` : t.title,
  }));
}

export async function getFinancialUpdateCandidates(userId: string): Promise<NotificationCandidate[]> {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    select: { id: true, title: true, amount: true, type: true },
    orderBy: { createdAt: 'desc' },
    take: RECENT_LIMIT,
  });
  return transactions.map((t) => ({
    type: 'FINANCIAL_UPDATE' as const,
    eventId: `transaction:${t.id}`,
    title: t.type === 'income' ? '\u{1F4B0} Daromad' : '\u{1F4B8} Xarajat',
    message: `${t.title}: ${t.amount.toLocaleString('uz-UZ')} so\u2018m`,
  }));
}

export async function getBusinessUpdateCandidates(userId: string): Promise<NotificationCandidate[]> {
  const plans = await prisma.businessPlan.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: RECENT_LIMIT,
  });
  return plans.map((p) => ({
    type: 'BUSINESS_UPDATE' as const,
    eventId: `business-plan:${p.id}`,
    title: '\u{1F4C8} Biznes yangilanishi',
    message: `"${p.businessName}" uchun biznes reja yaratildi.\n\n${formatSwotDigest(p)}`,
  }));
}

export async function getApplicationUpdateCandidates(userId: string): Promise<NotificationCandidate[]> {
  const applications = await prisma.creditApplication.findMany({
    where: { userId },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: RECENT_LIMIT,
  });
  return applications.map((a) => ({
    type: 'APPLICATION_UPDATE' as const,
    eventId: `credit-application:${a.id}`,
    title: '\u{1F4CB} Kredit arizasi',
    message: 'Yangi kredit moslik so\u2018rovi qabul qilindi va tahlil qilindi.',
  }));
}

export async function getSubscriptionUpdateCandidates(userId: string): Promise<NotificationCandidate[]> {
  const subscriptions = await prisma.subscription.findMany({
    where: { userId, status: { in: ['active', 'trialing'] } },
    select: {
      id: true,
      status: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: true,
      plan: { select: { name: true } },
    },
    take: RECENT_LIMIT,
  });

  const candidates: NotificationCandidate[] = [];
  const now = Date.now();
  const expiringThreshold = now + SUBSCRIPTION_EXPIRING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  for (const sub of subscriptions) {
    candidates.push({
      type: 'SUBSCRIPTION_UPDATE',
      eventId: `subscription:${sub.id}:activated`,
      title: '\u2705 Obuna faollashtirildi',
      message: `${sub.plan.name} rejasi yoqildi.`,
    });

    if (sub.currentPeriodEnd.getTime() <= expiringThreshold && sub.currentPeriodEnd.getTime() > now) {
      const periodKey = sub.currentPeriodEnd.toISOString().slice(0, 10);
      candidates.push({
        type: 'SUBSCRIPTION_UPDATE',
        eventId: `subscription:${sub.id}:expiring:${periodKey}`,
        title: '\u23F3 Obuna tugayapti',
        message: `${sub.plan.name} obunangiz ${sub.currentPeriodEnd.toLocaleDateString('uz-UZ')} sanasida tugaydi.`,
      });
    }

    if (sub.cancelAtPeriodEnd) {
      candidates.push({
        type: 'SUBSCRIPTION_UPDATE',
        eventId: `subscription:${sub.id}:cancel_requested`,
        title: '\u{1F515} Obuna bekor qilindi',
        message: `${sub.plan.name} obunangiz muddat oxirida faolsizlanadi.`,
      });
    }
  }

  return candidates;
}

/** Mirrors the platform's own existing in-app Notification rows (already real events — security/payment/etc). */
export async function getSystemNotificationCandidates(userId: string): Promise<NotificationCandidate[]> {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    select: { id: true, title: true, body: true },
    orderBy: { createdAt: 'desc' },
    take: RECENT_LIMIT,
  });
  return notifications.map((n) => ({
    type: 'SYSTEM_NOTIFICATION' as const,
    eventId: `app-notification:${n.id}`,
    title: `\u{1F514} ${n.title}`,
    message: n.body,
  }));
}

export async function getXReportCandidates(userId: string, now: Date = new Date()): Promise<NotificationCandidate[]> {
  const ledger = await getDailyLedger(userId, now);
  if (ledger.count === 0) return [];
  return [
    {
      type: 'FINANCIAL_UPDATE',
      eventId: `x-report:${ledger.day}`,
      title: '\u{1F4CB} X-hisobot',
      message: formatXReport(ledger),
    },
  ];
}

export async function getZReportCandidates(userId: string, now: Date = new Date()): Promise<NotificationCandidate[]> {
  const ledger = await getDailyLedger(userId, now);
  if (ledger.count === 0 || !ledger.zReady) return [];
  return [
    {
      type: 'FINANCIAL_UPDATE',
      eventId: `z-report:${ledger.day}`,
      title: '\u{1F4C4} Z-hisobot',
      message: formatZReport(ledger),
    },
  ];
}

export async function getPaymentsDueCandidates(userId: string, now: Date = new Date()): Promise<NotificationCandidate[]> {
  const items = await getPaymentsDue(userId);
  if (items.length === 0) return [];
  return [
    {
      type: 'TASK_REMINDER',
      eventId: `payments-due:${tashkentDayKey(now)}`,
      title: '\u{1F4B3} To\u2018lovlar va muddatlar',
      message: formatPaymentsDue(items),
    },
  ];
}

export async function getSwotDigestCandidates(userId: string, now: Date = new Date()): Promise<NotificationCandidate[]> {
  const plan = await getLatestPlan(userId);
  if (!plan?.id) return [];
  return [
    {
      type: 'BUSINESS_UPDATE',
      eventId: `swot:${plan.id}:${tashkentDayKey(now)}`,
      title: '\u{1F9E0} SWOT tahlili',
      message: formatSwotDigest(plan),
    },
  ];
}

export async function getTopicDigestCandidates(userId: string, now: Date = new Date()): Promise<NotificationCandidate[]> {
  const profile = await prisma.businessProfile.findUnique({ where: { userId } });
  const answers = parseSurveyAnswers(profile?.surveyAnswers);
  const hasSurvey = Boolean(profile?.surveyDone || answers.path || answers.legal || answers.finance);
  if (!hasSurvey) return [];
  const [ledger, overdue] = await Promise.all([
    getDailyLedger(userId, now),
    prisma.task.count({ where: { userId, completed: false, status: 'overdue' } }),
  ]);
  return [
    {
      type: 'BUSINESS_UPDATE',
      eventId: `topic-digest:${tashkentDayKey(now)}`,
      title: '\u{1F4CC} Huquqiy / iqtisodiy / moliyaviy eslatma',
      message: formatTopicDigest({
        day: ledger.day,
        answers,
        todayTurnover: ledger.turnover,
        todayCount: ledger.count,
        overdueCount: overdue,
      }),
    },
  ];
}

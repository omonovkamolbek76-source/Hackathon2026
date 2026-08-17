import { prisma } from '@/lib/db';
import { buildSwotFromPlan, formatSwotText, type StoredPlanFields, type Swot } from '@/lib/business-plan';

/** Asia/Tashkent is UTC+5 year-round (no DST). */
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
export const Z_CLOSE_HOUR = 20;
const DAY_TX_CAP = 5_000;

export type TashkentWindow = {
  day: string;
  start: Date;
  end: Date;
  hour: number;
  zReady: boolean;
};

export type DailyLedger = {
  day: string;
  income: number;
  expense: number;
  net: number;
  turnover: number;
  count: number;
  incomeCount: number;
  expenseCount: number;
  zReady: boolean;
};

export type PaymentDueItem = {
  kind: 'task' | 'payment';
  title: string;
  detail: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function tashkentParts(now: Date) {
  const shifted = new Date(now.getTime() + TASHKENT_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    date: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

export function tashkentDayKey(now: Date): string {
  const p = tashkentParts(now);
  return `${p.year}-${pad2(p.month + 1)}-${pad2(p.date)}`;
}

export function tashkentDayBounds(now: Date = new Date()): TashkentWindow {
  const p = tashkentParts(now);
  const startUtc = Date.UTC(p.year, p.month, p.date, 0, 0, 0, 0) - TASHKENT_OFFSET_MS;
  return {
    day: `${p.year}-${pad2(p.month + 1)}-${pad2(p.date)}`,
    start: new Date(startUtc),
    end: new Date(startUtc + 24 * 60 * 60 * 1000),
    hour: p.hour,
    zReady: p.hour >= Z_CLOSE_HOUR,
  };
}

export function som(amount: number): string {
  return `${amount.toLocaleString('uz-UZ')} so\u2018m`;
}

export function summarizeAmounts(
  txs: { amount: number; type: string }[],
): Pick<DailyLedger, 'income' | 'expense' | 'net' | 'turnover' | 'count' | 'incomeCount' | 'expenseCount'> {
  let income = 0;
  let expense = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  for (const t of txs) {
    if (t.type === 'income') {
      income += t.amount;
      incomeCount += 1;
    } else if (t.type === 'expense') {
      expense += t.amount;
      expenseCount += 1;
    }
  }
  return {
    income,
    expense,
    net: income - expense,
    turnover: income,
    count: incomeCount + expenseCount,
    incomeCount,
    expenseCount,
  };
}

export async function getDailyLedger(userId: string, now: Date = new Date()): Promise<DailyLedger> {
  const window = tashkentDayBounds(now);
  const txs = await prisma.transaction.findMany({
    where: { userId, occurredAt: { gte: window.start, lt: window.end } },
    select: { amount: true, type: true },
    take: DAY_TX_CAP,
  });
  return {
    day: window.day,
    zReady: window.zReady,
    ...summarizeAmounts(txs),
  };
}

export async function getPaymentsDue(userId: string): Promise<PaymentDueItem[]> {
  const [tasks, payments] = await Promise.all([
    prisma.task.findMany({
      where: {
        userId,
        completed: false,
        OR: [{ status: 'overdue' }, { status: 'today', category: { in: ['tax', 'bank'] } }],
      },
      select: { title: true, subtitle: true, dueDate: true, status: true, category: true },
      take: 20,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.payment.findMany({
      where: { userId, status: 'pending' },
      select: { purpose: true, amount: true, currency: true },
      take: 20,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const items: PaymentDueItem[] = [];
  for (const t of tasks) {
    const bits = [t.subtitle, t.dueDate ? `Muddat: ${t.dueDate}` : '', t.status === 'overdue' ? 'Kechikkan' : 'Bugun']
      .filter(Boolean)
      .join(' · ');
    items.push({ kind: 'task', title: t.title, detail: bits });
  }
  for (const p of payments) {
    items.push({
      kind: 'payment',
      title: p.purpose || 'To\u2018lov',
      detail: `${som(p.amount)} (${p.currency}) · kutilmoqda`,
    });
  }
  return items;
}

export async function getLatestPlan(userId: string): Promise<StoredPlanFields | null> {
  const plan = await prisma.businessPlan.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return plan;
}

export function formatXReport(ledger: DailyLedger): string {
  if (ledger.count === 0) {
    return `X-hisobot \u2014 ${ledger.day} (Toshkent)\n\nBugun platformada tranzaksiya yo\u2018q.`;
  }
  return [
    `X-hisobot \u2014 ${ledger.day} (Toshkent, yopilmagan)`,
    '',
    `Aylanma (kirim): ${som(ledger.turnover)}`,
    `Xarajat: ${som(ledger.expense)}`,
    `Sof: ${som(ledger.net)}`,
    `Operatsiyalar: ${ledger.count} ta (${ledger.incomeCount} kirim, ${ledger.expenseCount} chiqim)`,
    '',
    `Manba: faqat sizning bugungi yozuvlaringiz. Z-hisobot soat ${Z_CLOSE_HOUR}:00 dan keyin yuboriladi.`,
  ].join('\n');
}

export function formatZReport(ledger: DailyLedger): string {
  if (ledger.count === 0) {
    return `Z-hisobot \u2014 ${ledger.day} (Toshkent)\n\nBugun yopish uchun tranzaksiya yo\u2018q.`;
  }
  return [
    `Z-hisobot \u2014 ${ledger.day} (Toshkent, kun yopilishi)`,
    '',
    `Aylanma (kirim): ${som(ledger.turnover)}`,
    `Xarajat: ${som(ledger.expense)}`,
    `Sof: ${som(ledger.net)}`,
    `Operatsiyalar: ${ledger.count} ta (${ledger.incomeCount} kirim, ${ledger.expenseCount} chiqim)`,
    '',
    'Manba: faqat sizning bugungi yozuvlaringiz. Bu kun yakuni hisoboti.',
  ].join('\n');
}

export function formatPaymentsDue(items: PaymentDueItem[]): string {
  if (items.length === 0) {
    return 'Hozircha kutilayotgan to\u2018lov yoki muddati kelgan vazifa yo\u2018q.';
  }
  return [
    'Nimalarga to\u2018lash / bajarish kerak:',
    '',
    ...items.map((item) => `\u2022 ${item.title}${item.detail ? `\n  ${item.detail}` : ''}`),
  ].join('\n');
}

export function swotForPlan(plan: StoredPlanFields): Swot {
  return buildSwotFromPlan(plan);
}

export function formatSwotDigest(plan: StoredPlanFields): string {
  const swot = buildSwotFromPlan(plan);
  return [`SWOT \u2014 ${plan.businessName}`, '', formatSwotText(swot)].join('\n');
}

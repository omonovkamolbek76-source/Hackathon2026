import { prisma } from '@/lib/db';
import { formatPaymentsDue, formatSwotDigest, formatXReport, formatZReport, getDailyLedger, getLatestPlan, getPaymentsDue } from '@/lib/reports/platform';

/**
 * Least-data context assembly (section 5): the AI Gateway never forwards raw
 * database rows or the full transaction history to Gemini — only small,
 * aggregated, already-anonymized-enough summaries needed to give relevant
 * advice. No email, no account IDs, no full transaction list.
 */

export type CopilotContext = {
  ownerName?: string;
  businessName: string;
  stage: string;
  idea: string;
  industry: string;
  targetCustomer: string;
  goalsSummary: string;
  financeSummary: string;
  tasksSummary: string;
  todaySummary?: string;
  xReportSummary?: string;
  zReportSummary?: string;
  paymentsDueSummary?: string;
  swotSummary?: string;
};

function parseJsonArray(raw: string | null | undefined): string[] {
  try {
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function buildCopilotContext(userId: string): Promise<CopilotContext> {
  const [profile, user, incomeAgg, expenseAgg, openTasks, ledger, dues, latestPlan] = await Promise.all([
    prisma.businessProfile.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.transaction.aggregate({ where: { userId, type: 'income' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { userId, type: 'expense' }, _sum: { amount: true } }),
    prisma.task.findMany({
      where: { userId, completed: false },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { title: true },
    }),
    getDailyLedger(userId),
    getPaymentsDue(userId),
    getLatestPlan(userId),
  ]);

  const income = incomeAgg._sum.amount || 0;
  const expense = expenseAgg._sum.amount || 0;
  const goals = parseJsonArray(profile?.goals);

  const todaySummary =
    ledger.count === 0
      ? `Bugun (${ledger.day}, Toshkent) platformada tranzaksiya yo'q.`
      : `Bugun (${ledger.day}): aylanma ${ledger.turnover.toLocaleString('uz-UZ')} so'm, xarajat ${ledger.expense.toLocaleString('uz-UZ')} so'm, sof ${ledger.net.toLocaleString('uz-UZ')} so'm, ${ledger.count} ta yozuv.`;

  return {
    ownerName: user?.name?.trim() || '',
    businessName: profile?.businessName || '',
    stage: profile?.stage || 'IDEA',
    idea: profile?.idea || '',
    industry: profile?.industry || '',
    targetCustomer: profile?.targetCustomer || '',
    goalsSummary: goals.slice(0, 3).join('; '),
    financeSummary: `Jami kirim: ${income.toLocaleString('uz-UZ')} so'm, jami chiqim: ${expense.toLocaleString('uz-UZ')} so'm, sof: ${(income - expense).toLocaleString('uz-UZ')} so'm`,
    tasksSummary: openTasks.map((t) => t.title).join('; '),
    todaySummary,
    xReportSummary: formatXReport(ledger),
    zReportSummary: ledger.zReady
      ? formatZReport(ledger)
      : `Z-hisobot hali yopilmagan (soat 20:00, Toshkent). Joriy X-hisobot raqamlari yuqorida.`,
    paymentsDueSummary: formatPaymentsDue(dues),
    swotSummary: latestPlan ? formatSwotDigest(latestPlan) : 'Saqlangan biznes reja yo‘q — SWOT uchun avval Biznes reja yarating.',
  };
}

export function contextToPromptBlock(ctx: CopilotContext): string {
  return [
    ctx.ownerName ? `Egasi ismi: ${ctx.ownerName} (ismni qayta so'ramang)` : '',
    `Biznes nomi: ${ctx.businessName || 'noma\u2019lum'}`,
    `Bosqich: ${ctx.stage}`,
    ctx.idea ? `G'oya: ${ctx.idea}` : '',
    ctx.industry ? `Soha: ${ctx.industry}` : '',
    ctx.targetCustomer ? `Maqsadli mijoz: ${ctx.targetCustomer}` : '',
    ctx.goalsSummary ? `Maqsadlar: ${ctx.goalsSummary}` : '',
    `Moliya: ${ctx.financeSummary}`,
    ctx.todaySummary ? `Bugungi hisob: ${ctx.todaySummary}` : '',
    ctx.xReportSummary ? `X-hisobot:\n${ctx.xReportSummary}` : '',
    ctx.zReportSummary ? `Z-hisobot:\n${ctx.zReportSummary}` : '',
    ctx.paymentsDueSummary ? `To'lovlar:\n${ctx.paymentsDueSummary}` : '',
    ctx.swotSummary ? `SWOT:\n${ctx.swotSummary}` : '',
    ctx.tasksSummary ? `Ochiq vazifalar: ${ctx.tasksSummary}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function wantsPlatformReport(text: string): boolean {
  return /x[\s-]?hisobot|z[\s-]?hisobot|ochchot|hisob[\s-]?kitob|aylanma|swot|svot|bugungi\s+(hisob|tahlil|kirim|chiqim)|(nimalarga\s+)?to['\u2018\u2019]lov(lar)?\s+(qilish|kerak)|tulov(lar)?\s+(qilish|kerak)/i.test(
    text,
  );
}

export function localPlatformReportReply(ctx: CopilotContext, message: string, _stage = 0): string {
  const t = message.toLowerCase();
  const parts: string[] = [];
  const wantsSwot = /swot|svot/i.test(t);
  const wantsZ = /z[\s-]?hisobot|z[\s-]?ochchot/i.test(t);
  const wantsX = /x[\s-]?hisobot|x[\s-]?ochchot/i.test(t);
  const wantsPay = /to['\u2018\u2019]lov|tulov/i.test(t);
  const specificCount = [wantsSwot, wantsZ, wantsX, wantsPay].filter(Boolean).length;
  const wantsAll = specificCount !== 1 || /hisob[\s-]?kitob|tahlil|aylanma/.test(t);

  parts.push('Bu raqamlar faqat platformadagi sizning yozuvlaringizdan. Hech narsa uydirilmagan.');
  parts.push('');

  if (wantsAll || /hisob|aylanma|tahlil|ochchot/.test(t)) {
    if (ctx.todaySummary) parts.push(ctx.todaySummary, '');
    if (ctx.financeSummary) parts.push(`Umumiy (barcha vaqt): ${ctx.financeSummary}`, '');
  }
  if (wantsAll || wantsX) {
    parts.push(ctx.xReportSummary || 'X-hisobot: bugun yozuv yo‘q.', '');
  }
  if (wantsAll || wantsZ) {
    parts.push(ctx.zReportSummary || 'Z-hisobot hali tayyor emas.', '');
  }
  if (wantsAll || wantsPay) {
    parts.push(ctx.paymentsDueSummary || 'Kutilayotgan to‘lov yo‘q.', '');
  }
  if (wantsAll || wantsSwot) {
    parts.push(ctx.swotSummary || 'SWOT uchun biznes reja yarating.', '');
  }

  parts.push('Batafsil: Tahlil sahifasi (X/Z), Biznes reja (SWOT). Telegram ulangan bo‘lsa, shu hisobotlar u yerga ham ketadi.');
  return parts.filter((p, i, arr) => !(p === '' && arr[i - 1] === '')).join('\n');
}

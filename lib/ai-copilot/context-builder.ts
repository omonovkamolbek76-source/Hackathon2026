import { prisma } from '@/lib/db';

/**
 * Least-data context assembly (section 5): the AI Gateway never forwards raw
 * database rows or the full transaction history to Gemini — only small,
 * aggregated, already-anonymized-enough summaries needed to give relevant
 * advice. No email, no account IDs, no full transaction list.
 */

export type CopilotContext = {
  businessName: string;
  stage: string;
  idea: string;
  industry: string;
  targetCustomer: string;
  goalsSummary: string;
  financeSummary: string;
  tasksSummary: string;
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
  const [profile, incomeAgg, expenseAgg, openTasks] = await Promise.all([
    prisma.businessProfile.findUnique({ where: { userId } }),
    prisma.transaction.aggregate({ where: { userId, type: 'income' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { userId, type: 'expense' }, _sum: { amount: true } }),
    prisma.task.findMany({
      where: { userId, completed: false },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { title: true },
    }),
  ]);

  const income = incomeAgg._sum.amount || 0;
  const expense = expenseAgg._sum.amount || 0;
  const goals = parseJsonArray(profile?.goals);

  return {
    businessName: profile?.businessName || '',
    stage: profile?.stage || 'IDEA',
    idea: profile?.idea || '',
    industry: profile?.industry || '',
    targetCustomer: profile?.targetCustomer || '',
    goalsSummary: goals.slice(0, 3).join('; '),
    financeSummary: `Jami kirim: ${income.toLocaleString('uz-UZ')} so'm, jami chiqim: ${expense.toLocaleString('uz-UZ')} so'm, sof: ${(income - expense).toLocaleString('uz-UZ')} so'm`,
    tasksSummary: openTasks.map((t) => t.title).join('; '),
  };
}

export function contextToPromptBlock(ctx: CopilotContext): string {
  return [
    `Biznes nomi: ${ctx.businessName || 'noma\u2019lum'}`,
    `Bosqich: ${ctx.stage}`,
    ctx.idea ? `G'oya: ${ctx.idea}` : '',
    ctx.industry ? `Soha: ${ctx.industry}` : '',
    ctx.targetCustomer ? `Maqsadli mijoz: ${ctx.targetCustomer}` : '',
    ctx.goalsSummary ? `Maqsadlar: ${ctx.goalsSummary}` : '',
    `Moliya: ${ctx.financeSummary}`,
    ctx.tasksSummary ? `Ochiq vazifalar: ${ctx.tasksSummary}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

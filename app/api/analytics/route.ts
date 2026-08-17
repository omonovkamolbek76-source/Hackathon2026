import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { jsonError, jsonOk } from '@/lib/api';
import { getDailyLedger, getPaymentsDue } from '@/lib/reports/platform';

type Tx = { type: string; amount: number; category: string; occurredAt: Date };

export async function GET() {
  try {
    const user = await requireUser();
    const txs = (await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { occurredAt: 'asc' },
    })) as Tx[];

    const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const byCategory = new Map<string, number>();
    for (const t of txs.filter((x) => x.type === 'expense')) {
      byCategory.set(t.category, (byCategory.get(t.category) || 0) + t.amount);
    }

    const colors = [
      'hsl(160 100% 33%)',
      'hsl(210 80% 55%)',
      'hsl(30 90% 55%)',
      'hsl(270 60% 60%)',
      'hsl(200 60% 50%)',
    ];

    const expenseBreakdown = Array.from(byCategory.entries()).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length],
    }));

    const months: { month: string; revenue: number; expense: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('uz-UZ', { month: 'short' });
      const start = d.getTime();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      const slice = txs.filter((t) => {
        const ts = t.occurredAt.getTime();
        return ts >= start && ts < end;
      });
      months.push({
        month: label,
        revenue: slice.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: slice.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      });
    }

    const [ledger, paymentsDue] = await Promise.all([getDailyLedger(user.id), getPaymentsDue(user.id)]);

    return jsonOk({
      analytics: {
        monthlyRevenue: months,
        expenseBreakdown,
        netProfit: income - expense,
        growth: 0,
        topProduct: expenseBreakdown[0]?.name || '—',
        topProductShare: 0,
        today: {
          day: ledger.day,
          income: ledger.income,
          expense: ledger.expense,
          net: ledger.net,
          turnover: ledger.turnover,
          count: ledger.count,
          zReady: ledger.zReady,
          paymentsDue: paymentsDue.map((p) => ({ title: p.title, detail: p.detail })),
        },
      },
      kpis: [
        {
          id: 'revenue',
          label: 'Daromad',
          value: income,
          trend: 0,
          trendLabel: 'jami',
          format: 'currency',
          sparkline: months.map((m) => m.revenue / 1_000_000 || 0),
          color: 'hsl(160 100% 33%)',
        },
        {
          id: 'expense',
          label: 'Xarajat',
          value: expense,
          trend: 0,
          trendLabel: 'jami',
          format: 'currency',
          sparkline: months.map((m) => m.expense / 1_000_000 || 0),
          color: 'hsl(30 90% 55%)',
        },
        {
          id: 'profit',
          label: 'Sof',
          value: income - expense,
          trend: 0,
          trendLabel: 'jami',
          format: 'currency',
          sparkline: months.map((m) => (m.revenue - m.expense) / 1_000_000 || 0),
          color: 'hsl(210 80% 55%)',
        },
      ],
      empty: txs.length === 0,
    });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

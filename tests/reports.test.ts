import { describe, expect, it } from 'vitest';
import {
  formatXReport,
  formatZReport,
  formatPaymentsDue,
  som,
  summarizeAmounts,
  tashkentDayBounds,
  tashkentDayKey,
  Z_CLOSE_HOUR,
} from '@/lib/reports/platform';

describe('Tashkent day window', () => {
  it('maps UTC 09:00 on 17 Aug 2026 to Tashkent 14:00 same day (X ready, Z not)', () => {
    const now = new Date(Date.UTC(2026, 7, 17, 9, 0, 0));
    const w = tashkentDayBounds(now);
    expect(w.day).toBe('2026-08-17');
    expect(w.hour).toBe(14);
    expect(w.zReady).toBe(false);
    expect(tashkentDayKey(now)).toBe('2026-08-17');
  });

  it(`marks Z ready at Tashkent ${Z_CLOSE_HOUR}:00`, () => {
    const now = new Date(Date.UTC(2026, 7, 17, 15, 0, 0)); // 20:00 Tashkent
    const w = tashkentDayBounds(now);
    expect(w.hour).toBe(20);
    expect(w.zReady).toBe(true);
    expect(w.day).toBe('2026-08-17');
  });

  it('does not include the next Tashkent midnight in the same day window', () => {
    const justBefore = new Date(Date.UTC(2026, 7, 16, 18, 59, 0)); // 23:59 Tashkent Aug 16
    const justAfter = new Date(Date.UTC(2026, 7, 16, 19, 0, 0)); // 00:00 Tashkent Aug 17
    expect(tashkentDayKey(justBefore)).toBe('2026-08-16');
    expect(tashkentDayKey(justAfter)).toBe('2026-08-17');
  });
});

describe('ledger formatting — platform numbers only', () => {
  it('sums income as turnover and does not invent extra rows', () => {
    const s = summarizeAmounts([
      { amount: 1_200_000, type: 'income' },
      { amount: 300_000, type: 'expense' },
      { amount: 800_000, type: 'income' },
    ]);
    expect(s.turnover).toBe(2_000_000);
    expect(s.expense).toBe(300_000);
    expect(s.net).toBe(1_700_000);
    expect(s.count).toBe(3);
    expect(s.incomeCount).toBe(2);
  });

  it('X-report contains the exact summed amounts', () => {
    const text = formatXReport({
      day: '2026-08-17',
      income: 1_200_000,
      expense: 300_000,
      net: 900_000,
      turnover: 1_200_000,
      count: 4,
      incomeCount: 2,
      expenseCount: 2,
      zReady: false,
    });
    expect(text).toContain('X-hisobot');
    expect(text).toContain(som(1_200_000));
    expect(text).toContain(som(300_000));
    expect(text).toContain('4 ta');
  });

  it('Z-report is empty-data safe', () => {
    const text = formatZReport({
      day: '2026-08-17',
      income: 0,
      expense: 0,
      net: 0,
      turnover: 0,
      count: 0,
      incomeCount: 0,
      expenseCount: 0,
      zReady: true,
    });
    expect(text).toMatch(/tranzaksiya yo/i);
  });

  it('payments due lists stored titles only', () => {
    const text = formatPaymentsDue([
      { kind: 'task', title: 'Soliq to‘lash', detail: 'Kechikkan' },
      { kind: 'payment', title: 'Obuna', detail: `${som(50_000)} · kutilmoqda` },
    ]);
    expect(text).toContain('Soliq to‘lash');
    expect(text).toContain('Obuna');
    expect(text).not.toMatch(/taxminan 1 000 000/i);
  });
});

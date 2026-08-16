import { describe, expect, it } from 'vitest';
import { monthlyPayment, creditLoadCheck, parseMillions, breakEvenMonths } from '@/lib/finance-tools';

describe('finance-tools', () => {
  it('calculates monthly payment', () => {
    const pmt = monthlyPayment(50_000_000, 24, 12);
    expect(pmt).toBeGreaterThan(4_000_000);
    expect(pmt).toBeLessThan(6_000_000);
  });

  it('flags unhealthy credit load', () => {
    const r = creditLoadCheck(1_000_000, 800_000);
    expect(r.healthy).toBe(false);
  });

  it('parses millions', () => {
    expect(parseMillions('50 mln so‘m')).toBe(50_000_000);
  });

  it('breakeven months', () => {
    expect(breakEvenMonths(10_000_000, 2_000_000).months).toBe(5);
  });
});

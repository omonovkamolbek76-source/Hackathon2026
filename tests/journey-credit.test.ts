import { describe, expect, it } from 'vitest';
import { coachRespond, isSensitiveRequest, welcomeReply } from '@/lib/journey';
import { matchCreditProducts } from '@/lib/credit-match';

describe('journey coach', () => {
  it('welcomes with one question', () => {
    const w = welcomeReply();
    expect(w.stage).toBe(0);
    expect(w.quickReplies?.length).toBeGreaterThan(0);
  });

  it('blocks sensitive requests', () => {
    expect(isSensitiveRequest('mening cvv 123')).toBe(true);
  });

  it('advances idea stage', () => {
    const r = coachRespond('G‘oyam bor', 0, {});
    expect(r.stage).toBe(1);
  });
});

describe('credit match', () => {
  it('scores products deterministically', () => {
    const products = [
      {
        id: '1',
        name: 'A',
        bank: 'B',
        amountMin: 10_000_000,
        amountMax: 100_000_000,
        interestRate: 22,
        termMonths: 24,
        gracePeriod: 3,
        collateral: 'x',
        purposeTags: 'equipment,working',
        active: true,
        sourceNote: 'n',
      },
    ];
    const matched = matchCreditProducts(products, {
      purpose: 'Uskuna',
      amount: '50 mln',
      revenue: '20 mln',
      businessStatus: 'Amaldagi biznesim bor',
      debt: "Yo'q, qarz yo'q",
      repayment: '20% gacha',
    });
    expect(matched[0].matchScore).toBeGreaterThan(50);
    expect(matched[0].badge).toContain('moslik');
  });
});

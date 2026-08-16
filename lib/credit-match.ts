import { monthlyPayment, creditLoadCheck, parseMillions } from '@/lib/finance-tools';

export type MatchAnswers = {
  businessStatus?: string;
  purpose?: string;
  amount?: string;
  revenue?: string;
  debt?: string;
  repayment?: string;
  collateral?: string;
  region?: string;
};

export type CatalogProduct = {
  id: string;
  name: string;
  bank: string;
  amountMin: number;
  amountMax: number;
  interestRate: number;
  termMonths: number;
  gracePeriod: number;
  collateral: string;
  purposeTags: string;
  active: boolean;
  sourceNote: string;
};

export type MatchedProduct = {
  id: string;
  name: string;
  bank: string;
  amountMin: number;
  amountMax: number;
  interestRate: number;
  termMonths: number;
  gracePeriod: number;
  collateral: string;
  purpose: string;
  matchScore: number;
  recommendedReason: string;
  badge?: string;
  sourceNote: string;
  sampleMonthlyPayment?: number;
  loadHealthy?: boolean;
};

function purposeTag(purpose?: string): string {
  const p = (purpose || '').toLowerCase();
  if (/uskuna|equipment/i.test(p)) return 'equipment';
  if (/tovar|inventory/i.test(p)) return 'inventory';
  if (/kengay|expansion/i.test(p)) return 'expansion';
  if (/aylanma|working/i.test(p)) return 'working';
  if (/g.?oya|start|yangi/i.test(p)) return 'startup';
  return 'working';
}

/** Deterministic scoring — not a bank decision. */
export function matchCreditProducts(
  products: CatalogProduct[],
  answers: MatchAnswers,
): MatchedProduct[] {
  const amount = parseMillions(answers.amount || '') ?? 50_000_000;
  const revenue = parseMillions(answers.revenue || '') ?? 10_000_000;
  const tag = purposeTag(answers.purpose);
  const hasDebt = /bitta|ikki|bor/i.test(answers.debt || '');
  const highRepayment = /30%/i.test(answers.repayment || '');
  const startup = /yangi|g.?oya/i.test(answers.businessStatus || '');

  const scored = products
    .filter((p) => p.active)
    .map((p) => {
      let score = 55;
      const reasons: string[] = [];

      if (amount >= p.amountMin && amount <= p.amountMax) {
        score += 18;
        reasons.push('So‘ralgan summa mahsulot diapazoniga mos');
      } else if (amount < p.amountMin) {
        score -= 8;
        reasons.push('Summa minimal chegaradan past');
      } else {
        score -= 15;
        reasons.push('Summa maksimal chegaradan yuqori');
      }

      const tags = p.purposeTags.split(',').map((t) => t.trim());
      if (tags.includes(tag)) {
        score += 12;
        reasons.push('Maqsad teglariga mos');
      }

      if (startup && tags.includes('startup')) {
        score += 8;
        reasons.push('Yangi biznes uchun mos dastur');
      }

      if (p.gracePeriod >= 3) {
        score += 5;
        reasons.push(`Imtiyozli davr: ${p.gracePeriod} oy`);
      }

      if (hasDebt) score -= 6;
      if (highRepayment) score -= 4;

      const pmt = Math.round(monthlyPayment(amount, p.interestRate, p.termMonths));
      const load = creditLoadCheck(revenue, pmt);
      if (load.healthy) {
        score += 10;
        reasons.push('Namuna qarz yuki qabul qilinadigan');
      } else {
        score -= 12;
        reasons.push('Namuna qarz yuki og‘ir ko‘rinadi');
      }

      score = Math.max(0, Math.min(99, Math.round(score)));

      return {
        id: p.id,
        name: p.name,
        bank: p.bank,
        amountMin: p.amountMin,
        amountMax: p.amountMax,
        interestRate: p.interestRate,
        termMonths: p.termMonths,
        gracePeriod: p.gracePeriod,
        collateral: p.collateral,
        purpose: p.purposeTags,
        matchScore: score,
        recommendedReason:
          reasons.join('. ') +
          '. Yakuniy qaror bankda — bu faqat taqqoslash bahosi.',
        sourceNote: p.sourceNote,
        sampleMonthlyPayment: pmt,
        loadHealthy: load.healthy,
        badge: undefined as string | undefined,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  if (scored[0]) scored[0].badge = 'Eng yaxshi moslik (algoritm)';
  return scored;
}

import { describe, expect, it } from 'vitest';
import {
  businessPlanInputSchema,
  generateBusinessPlan,
  parseNextSteps,
  planToMarkdown,
  serializeSavedPlan,
  ideaStepSchema,
  marketStepSchema,
  financeStepSchema,
  firstZodMessage,
} from '@/lib/business-plan';

describe('business plan generator', () => {
  const base = {
    businessName: 'EcoBozor',
    audience: '18–35 yoshdagi shaharliklar',
    budget: 50_000_000,
    description: 'Ekologik mahsulotlarni onlayn yetkazib berish',
  };

  it('builds a full plan with SWOT from the user inputs', () => {
    const plan = generateBusinessPlan(base);
    expect(plan.businessName).toBe('EcoBozor');
    expect(plan.targetAudience).toContain('18–35');
    expect(plan.swot.strengths.some((s) => s.includes('EcoBozor'))).toBe(true);
    expect(plan.swot.weaknesses.length).toBeGreaterThan(0);
    expect(plan.swot.opportunities.length).toBeGreaterThan(0);
    expect(plan.swot.threats.length).toBeGreaterThan(0);
    expect(plan.nextSteps.length).toBeGreaterThanOrEqual(5);
  });

  it('uses monthlyTarget in the financial section when provided', () => {
    const withTarget = generateBusinessPlan({ ...base, monthlyTarget: 8_000_000 });
    expect(withTarget.financialPlan).toContain('8.0');
    const without = generateBusinessPlan(base);
    expect(without.financialPlan).not.toContain('8.0 mln');
  });

  it('folds location and competitor notes into generated text', () => {
    const plan = generateBusinessPlan({
      ...base,
      location: 'Toshkent',
      competitorNote: 'Yaqin do‘konda yetkazib berish yo‘q',
    });
    expect(plan.marketOpportunity).toContain('Toshkent');
    expect(plan.competitors).toContain('Yaqin do‘konda yetkazib berish yo‘q');
  });

  it('markdown includes SWOT and next steps', () => {
    const md = planToMarkdown(generateBusinessPlan(base));
    expect(md).toContain('# EcoBozor');
    expect(md).toContain('## SWOT');
    expect(md).toContain('Kuchli tomonlar');
    expect(md).toContain('## Keyingi qadamlar');
  });

  it('parses nextSteps JSON or a single string', () => {
    expect(parseNextSteps('["a","b"]')).toEqual(['a', 'b']);
    expect(parseNextSteps(['a', 'b'])).toEqual(['a', 'b']);
    expect(parseNextSteps('bitta qator')).toEqual(['bitta qator']);
    expect(parseNextSteps(null)).toEqual([]);
  });

  it('serializes a stored row with parsed nextSteps and SWOT', () => {
    const saved = serializeSavedPlan({
      id: 'plan_1',
      businessName: 'EcoBozor',
      targetAudience: 'oilalar',
      budget: 10_000_000,
      description: 'Yetkazib berish xizmati',
      concept: 'c',
      marketOpportunity: 'm',
      competitors: 'r',
      marketingPlan: 'k',
      operationalPlan: 'o',
      financialPlan: 'f',
      expenses: 'e',
      expectedRevenue: 'd',
      breakeven: 'b',
      nextSteps: JSON.stringify(['Birinchi qadam']),
      createdAt: new Date('2026-08-17T00:00:00.000Z'),
    });
    expect(saved.nextSteps).toEqual(['Birinchi qadam']);
    expect(saved.swot.strengths.length).toBeGreaterThan(0);
    expect(saved.markdown).toContain('EcoBozor');
  });
});

describe('business plan step validation', () => {
  it('rejects a short idea name/description', () => {
    const parsed = ideaStepSchema.safeParse({ businessName: 'e', description: 'qisqa' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(firstZodMessage(parsed.error)).toMatch(/kamida/i);
  });

  it('rejects a short audience on the market step', () => {
    expect(marketStepSchema.safeParse({ audience: 'x' }).success).toBe(false);
    expect(marketStepSchema.safeParse({ audience: '18–35 yosh' }).success).toBe(true);
  });

  it('rejects a non-positive budget', () => {
    expect(financeStepSchema.safeParse({ budget: 0 }).success).toBe(false);
    expect(financeStepSchema.safeParse({ budget: -1 }).success).toBe(false);
    expect(financeStepSchema.safeParse({ budget: 5_000_000 }).success).toBe(true);
    expect(financeStepSchema.safeParse({ budget: 5_000_000, monthlyTarget: '' }).success).toBe(true);
  });

  it('accepts a complete payload', () => {
    const parsed = businessPlanInputSchema.safeParse({
      businessName: 'Eco',
      description: 'Yetkazib berish xizmati',
      audience: '18 yoshdan',
      budget: 50_000_000,
    });
    expect(parsed.success).toBe(true);
  });
});

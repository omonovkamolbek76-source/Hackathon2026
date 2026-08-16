import { z } from 'zod';
import { breakEvenMonths } from '@/lib/finance-tools';

export const businessPlanInputSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  audience: z.string().trim().min(2).max(300),
  budget: z.coerce.number().int().positive().max(50_000_000_000),
  description: z.string().trim().min(10).max(4000),
});

export type BusinessPlanInput = z.infer<typeof businessPlanInputSchema>;

/** Deterministic plan generator from user inputs — not an LLM hallucination. */
export function generateBusinessPlan(input: BusinessPlanInput) {
  const budgetMln = Math.round(input.budget / 1_000_000);
  const monthlyNet = Math.max(1_000_000, Math.round(input.budget * 0.08));
  const be = breakEvenMonths(input.budget, monthlyNet);

  return {
    businessName: input.businessName,
    targetAudience: input.audience,
    budget: input.budget,
    description: input.description,
    concept: `${input.businessName}: ${input.description.slice(0, 280)}. Asosiy auditoriya — ${input.audience}.`,
    marketOpportunity: `Hududiy bozorda “${input.audience}” segmentiga e’tibor beriladi. Talabni tasdiqlash uchun kamida 5–10 potentsial mijoz bilan suhbat o‘tkazing va raqobatchi narxlarini yozib oling.`,
    competitors: `Raqobatchilarni jadvalda solishtiring: narx, joylashuv, sifat, yetkazib berish. Differensiatsiya nuqtangizni 1–2 jumlada aniq yozing.`,
    marketingPlan: `Birinchi 30 kun: Telegram/Instagramda auditoriyaga mos kontent, mahalla/og‘zaki tavsiya, birinchi 20 mijoz uchun oddiy sodiqlik taklifi.`,
    operationalPlan: `Ochilish checklisti: kerakli ruxsatnomalar, jihoz/tovar, savdo kanali, kunlik kirim-chiqim hisobi. Har kuni minimal savdo maqsadi belgilang.`,
    financialPlan: `Boshlang‘ich byudjet: ${budgetMln} mln so‘m. Namuna oylik sof foyda taxmini: ${(monthlyNet / 1_000_000).toFixed(1)} mln so‘m (foydalanuvchi ma’lumotiga asoslangan sodda model).`,
    expenses: `Byudjetni taxminan: jihoz/infratuzilma 40%, tovar/xomashyo 30%, marketing 10%, aylanma 15%, zaxira 5% (moslab o‘zgartiring).`,
    expectedRevenue: `Birinchi 3 oyda xarajatni qoplashga yaqinlashish; keyin oylik o‘sish maqsadini 10–15% qilib kuzating. Aniq prognoz uchun haqiqiy sotuvlarni kiriting.`,
    breakeven: be.message,
    nextSteps: [
      'Biznes reja PDF/Word sifatida eksport qilib bank/sherik bilan baham ko‘ring',
      'YaTT/MChJ va soliq rejimini tanlang (my.gov.uz)',
      'Kerak bo‘lsa kredit/dastur variantlarini taqqoslang (kafolat emas)',
      'Birinchi mijoz intervyularini o‘tkazing',
      'Ochilish checklistini vazifalarga bo‘ling',
    ],
  };
}

export function planToMarkdown(plan: ReturnType<typeof generateBusinessPlan>) {
  return [
    `# ${plan.businessName} — Biznes reja`,
    '',
    `**Auditoriya:** ${plan.targetAudience}`,
    `**Byudjet:** ${plan.budget.toLocaleString('uz-UZ')} so‘m`,
    '',
    '## Tavsif',
    plan.description,
    '',
    '## Konsepsiya',
    plan.concept,
    '',
    '## Bozor',
    plan.marketOpportunity,
    '',
    '## Raqobatchilar',
    plan.competitors,
    '',
    '## Marketing',
    plan.marketingPlan,
    '',
    '## Operatsion reja',
    plan.operationalPlan,
    '',
    '## Moliyaviy reja',
    plan.financialPlan,
    '',
    '## Xarajatlar',
    plan.expenses,
    '',
    '## Kutilayotgan daromad',
    plan.expectedRevenue,
    '',
    '## Breakeven',
    plan.breakeven,
    '',
    '## Keyingi qadamlar',
    ...plan.nextSteps.map((s, i) => `${i + 1}. ${s}`),
    '',
    '_TadbirkorAI — bu reja yordamchi hujjat. Yakuniy qarorlar foydalanuvchi va rasmiy organlarda._',
  ].join('\n');
}

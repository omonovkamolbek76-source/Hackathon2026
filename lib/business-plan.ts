import { z } from 'zod';
import { breakEvenMonths } from '@/lib/finance-tools';

export const ideaStepSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, 'Biznes nomi kamida 2 belgi bo‘lishi kerak')
    .max(120, 'Biznes nomi juda uzun'),
  description: z
    .string()
    .trim()
    .min(10, 'G‘oya tavsifi kamida 10 belgi bo‘lishi kerak')
    .max(4000, 'G‘oya tavsifi juda uzun'),
  location: z.string().trim().max(200, 'Hudud juda uzun').optional(),
});

export const marketStepSchema = z.object({
  audience: z
    .string()
    .trim()
    .min(2, 'Maqsadli auditoriya kamida 2 belgi bo‘lishi kerak')
    .max(300, 'Auditoriya tavsifi juda uzun'),
  competitorNote: z.string().trim().max(500, 'Raqobatchi izohi juda uzun').optional(),
});

export const financeStepSchema = z.object({
  budget: z.coerce
    .number({ invalid_type_error: 'Budjet raqam bo‘lishi kerak' })
    .int('Budjet butun son bo‘lishi kerak')
    .positive('Budjet musbat son bo‘lishi kerak')
    .max(50_000_000_000, 'Budjet juda katta'),
  monthlyTarget: z.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return undefined;
    return v;
  }, z.coerce.number().int().nonnegative().max(50_000_000_000).optional()),
});

export const businessPlanInputSchema = ideaStepSchema.merge(marketStepSchema).merge(financeStepSchema);

export type BusinessPlanInput = z.infer<typeof businessPlanInputSchema>;

export type Swot = {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
};

export type StoredPlanFields = {
  id?: string;
  businessName: string;
  targetAudience: string;
  budget: number;
  description: string;
  concept: string;
  marketOpportunity: string;
  competitors: string;
  marketingPlan: string;
  operationalPlan: string;
  financialPlan: string;
  expenses: string;
  expectedRevenue: string;
  breakeven: string;
  nextSteps: string | string[];
  createdAt?: Date | string;
};

export function firstZodMessage(error: z.ZodError): string {
  return error.issues[0]?.message || 'Validatsiya xatosi';
}

export function parseNextSteps(raw: string | string[] | null | undefined): string[] {
  if (Array.isArray(raw)) return raw.filter((x) => typeof x === 'string' && x.trim());
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v.filter((x) => typeof x === 'string' && x.trim());
  } catch {
    // stored as a single line of text
  }
  return raw.trim() ? [raw.trim()] : [];
}

export function buildSwotFromPlan(plan: {
  businessName: string;
  targetAudience: string;
  budget: number;
  description: string;
  breakeven?: string;
  competitors?: string;
}): Swot {
  const budgetMln = Math.round(plan.budget / 1_000_000);
  const strengths = [
    plan.businessName.trim()
      ? `Aniq nom: “${plan.businessName.trim()}” — reja shu brend atrofida yozilgan.`
      : 'Biznes nomi belgilangan.',
    plan.description.trim()
      ? `G‘oya yozilgan: ${plan.description.trim().slice(0, 160)}${plan.description.trim().length > 160 ? '…' : ''}`
      : 'G‘oya maydoni to‘ldirilgan.',
    plan.targetAudience.trim()
      ? `Maqsadli auditoriya aniqlangan: ${plan.targetAudience.trim()}.`
      : 'Auditoriya belgilangan.',
  ];

  const weaknesses = [
    budgetMln < 10
      ? `Boshlang‘ich byudjet ${budgetMln} mln so‘m — kichik zaxira; birinchi oylarda xarajatni qattiq nazorat qiling.`
      : `Boshlang‘ich byudjet ${budgetMln} mln so‘m — mablag‘ cheklangan resurs; har bir xarajat yozuvi kerak.`,
    'Bozor hali suhbat/sotuv bilan tasdiqlanmagan — bu reja taxminiy tuzilma, kafolat emas.',
    'SWOT faqat siz kiritgan maydonlardan tuziladi; raqobatchi narxlari avtomatik olinmaydi.',
  ];

  const opportunities = [
    plan.targetAudience.trim()
      ? `“${plan.targetAudience.trim()}” segmentida mahalliy talabni 5–10 ta suhbat bilan tekshirish mumkin.`
      : 'Mahalliy auditoriyada talabni suhbat orqali tekshirish mumkin.',
    'Telegram/Instagram va og‘zaki tavsiya orqali birinchi mijozlarni arzon yig‘ish imkoniyati.',
    'Kunlik kirim-chiqim yozuvi yo‘lga qo‘yilsa, X/Z hisobot asosida qaror qilish osonlashadi.',
  ];

  const threats = [
    plan.competitors?.trim()
      ? plan.competitors.trim().slice(0, 220)
      : 'Raqobatchilar va o‘xshash takliflar narxni bosishi mumkin — farqingizni 1–2 jumlada yozing.',
    plan.breakeven?.trim()
      ? `Pul oqimi: ${plan.breakeven.trim()}`
      : 'Breakeven gacha naqd pul yetishmasligi xavfi bor.',
    'Rasmiy ruxsatnoma, soliq rejimi yoki yetkazib berish uzilishi rejani sekinlashtirishi mumkin — joyida tekshiring.',
  ];

  return { strengths, weaknesses, opportunities, threats };
}

export function formatSwotText(swot: Swot): string {
  const block = (title: string, items: string[]) => [title, ...items.map((s) => `• ${s}`)].join('\n');
  return [
    block('Kuchli tomonlar', swot.strengths),
    '',
    block('Zaif tomonlar', swot.weaknesses),
    '',
    block('Imkoniyatlar', swot.opportunities),
    '',
    block('Tahdidlar', swot.threats),
  ].join('\n');
}

/** Deterministic plan generator from user inputs — not an LLM hallucination. */
export function generateBusinessPlan(input: BusinessPlanInput) {
  const budgetMln = Math.round(input.budget / 1_000_000);
  const monthlyNet = Math.max(
    1_000_000,
    Math.round(input.monthlyTarget && input.monthlyTarget > 0 ? input.monthlyTarget : input.budget * 0.08),
  );
  const be = breakEvenMonths(input.budget, monthlyNet);
  const locationBit = input.location?.trim() ? ` Hudud: ${input.location.trim()}.` : '';
  const competitorBit = input.competitorNote?.trim()
    ? ` Foydalanuvchi izohi: ${input.competitorNote.trim()}`
    : '';

  const plan = {
    businessName: input.businessName,
    targetAudience: input.audience,
    budget: input.budget,
    description: input.description,
    concept: `${input.businessName}: ${input.description.slice(0, 280)}. Asosiy auditoriya — ${input.audience}.${locationBit}`,
    marketOpportunity: `Hududiy bozorda “${input.audience}” segmentiga e’tibor beriladi.${locationBit} Talabni tasdiqlash uchun kamida 5–10 potentsial mijoz bilan suhbat o‘tkazing va raqobatchi narxlarini yozib oling.`,
    competitors: `Raqobatchilarni jadvalda solishtiring: narx, joylashuv, sifat, yetkazib berish. Differensiatsiya nuqtangizni 1–2 jumlada aniq yozing.${competitorBit}`,
    marketingPlan: `Birinchi 30 kun: Telegram/Instagramda auditoriyaga mos kontent, mahalla/og‘zaki tavsiya, birinchi 20 mijoz uchun oddiy sodiqlik taklifi.`,
    operationalPlan: `Ochilish checklisti: kerakli ruxsatnomalar, jihoz/tovar, savdo kanali, kunlik kirim-chiqim hisobi (X-hisobot kunduzi, Z-hisobot kechqurun). Har kuni minimal savdo maqsadi belgilang.`,
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
      'Har kuni X-hisobot, kun oxirida Z-hisobotni Tahlil sahifasida tekshiring',
    ],
  };

  return {
    ...plan,
    swot: buildSwotFromPlan(plan),
  };
}

export type GeneratedPlan = ReturnType<typeof generateBusinessPlan>;

export function planToMarkdown(plan: GeneratedPlan) {
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
    '## SWOT',
    formatSwotText(plan.swot),
    '',
    '## Keyingi qadamlar',
    ...plan.nextSteps.map((s, i) => `${i + 1}. ${s}`),
    '',
    '_TadbirkorAI — bu reja yordamchi hujjat. Yakuniy qarorlar foydalanuvchi va rasmiy organlarda._',
  ].join('\n');
}

export function serializeSavedPlan(row: StoredPlanFields) {
  const nextSteps = parseNextSteps(row.nextSteps);
  const swot = buildSwotFromPlan({
    businessName: row.businessName,
    targetAudience: row.targetAudience,
    budget: row.budget,
    description: row.description,
    breakeven: row.breakeven,
    competitors: row.competitors,
  });
  const generated = {
    businessName: row.businessName,
    targetAudience: row.targetAudience,
    budget: row.budget,
    description: row.description,
    concept: row.concept,
    marketOpportunity: row.marketOpportunity,
    competitors: row.competitors,
    marketingPlan: row.marketingPlan,
    operationalPlan: row.operationalPlan,
    financialPlan: row.financialPlan,
    expenses: row.expenses,
    expectedRevenue: row.expectedRevenue,
    breakeven: row.breakeven,
    nextSteps,
    swot,
  };
  return {
    id: row.id,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    ...generated,
    markdown: planToMarkdown(generated),
  };
}

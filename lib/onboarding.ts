import { z } from 'zod';
import { detectBusinessStage, type BusinessStage } from '@/lib/ai-copilot/business-stage';

export const onboardingPathSchema = z.enum(['IDEA', 'OPERATING']);
export type OnboardingPath = z.infer<typeof onboardingPathSchema>;

export const onboardingSaveSchema = z.object({
  path: onboardingPathSchema,
  businessName: z.string().trim().max(160).optional().default(''),
  idea: z.string().trim().max(2000).optional().default(''),
  industry: z.string().trim().max(80).optional().default(''),
  location: z.string().trim().max(80).optional().default(''),
  targetCustomer: z.string().trim().max(500).optional().default(''),
  product: z.string().trim().max(500).optional().default(''),
  service: z.string().trim().max(500).optional().default(''),
  budget: z.coerce.number().int().min(0).max(100_000_000_000).optional().default(0),
  marketEntry: z.string().trim().max(1000).optional().default(''),
  suppliers: z.array(z.string().trim().max(120)).max(20).optional().default([]),
  salesChannels: z.array(z.string().trim().max(60)).max(20).optional().default([]),
  tracksFinances: z.boolean().optional().default(false),
  goals: z.array(z.string().trim().max(200)).max(10).optional().default([]),
});

export type OnboardingSaveInput = z.infer<typeof onboardingSaveSchema>;

export function firstOnboardingError(error: z.ZodError): string {
  return error.issues[0]?.message || 'Validatsiya xatosi';
}

/** Per-step checks used by the wizard UI (same rules as the API). */
export function validateOnboardingStep(
  step: number,
  path: OnboardingPath | '',
  form: {
    idea?: string;
    targetCustomer?: string;
    product?: string;
    marketEntry?: string;
    location?: string;
    businessName?: string;
  },
): string | null {
  if (step === 0) {
    if (path !== 'IDEA' && path !== 'OPERATING') return 'G‘oya yoki ishlab turgan biznesni tanlang';
    return null;
  }
  if (path === 'IDEA') {
    if (step === 1 && (form.idea || '').trim().length < 10) return 'G‘oyangizni kamida 10 belgi bilan yozing';
    if (step === 2 && (form.targetCustomer || '').trim().length < 2) return 'Maqsadli mijozni yozing';
    if (step === 3 && (form.product || '').trim().length < 2) return 'Qaysi mahsulot yoki xizmatni yozing';
    if (step === 4 && (form.marketEntry || '').trim().length < 8) return 'Bozorga qanday chiqishingizni yozing';
    if (step === 5 && (form.location || '').trim().length < 2) return 'Qayerda sotishingizni (hudud) yozing';
  } else if (path === 'OPERATING') {
    if (step === 1 && (form.businessName || '').trim().length < 2) return 'Biznes nomini yozing';
    if (step === 2 && (form.product || '').trim().length < 2) return 'Nima sotilishini yozing';
    if (step === 3 && (form.location || '').trim().length < 2) return 'Qayerda sotishingizni yozing';
  }
  return null;
}

export function splitList(raw: string | undefined): string[] {
  return (raw || '')
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function resolveOnboardingStage(input: OnboardingSaveInput, salesCount: number, txCount: number, revenue: number): BusinessStage {
  return detectBusinessStage({
    hasIdea: Boolean(input.idea.trim()) || input.path === 'OPERATING',
    hasValidatedMarket: input.path === 'OPERATING' || Boolean(input.marketEntry.trim()),
    isRegistered: input.path === 'OPERATING',
    hasFirstSale: input.path === 'OPERATING' || salesCount > 0,
    transactionCount: txCount,
    totalRevenue: revenue,
  });
}

export function formatWelcomeMessage(name: string, businessName = ''): string {
  const who = name.trim() || 'Tadbirkor';
  const biz = businessName.trim();
  return [
    `\u{1F44B} Assalomu alaykum, ${who}!`,
    '',
    'TadbirkorAI ga xush kelibsiz.',
    biz ? `Biznesingiz: ${biz}.` : '',
    '',
    'Bu bot suhbat emas — bildirishnomalar uchun. Vazifalar, X/Z hisobot, aylanma, to\u2018lov muddatlari va SWOT shu yerga keladi. Raqamlar faqat sizning hisobingizdagi yozuvlardan.',
    '',
    'Keyingi qadam: ilovada profilni to\u2018ldiring \u2014 g\u2018oya yoki ishlab turgan biznes.',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

export function formatOnboardingCompleteMessage(input: {
  path: string;
  businessName: string;
  idea: string;
  product: string;
  marketEntry: string;
  tracksFinances: boolean;
}): string {
  if (input.path === 'OPERATING') {
    return [
      `\u2705 Profil saqlandi: ${input.businessName || 'biznes'}`,
      input.product ? `Mahsulot/xizmat: ${input.product}` : '',
      input.tracksFinances
        ? 'Mablag\u2018 hisobi yoqilgan. Kirim-chiqim yozilsa, X/Z hisobot va maslahat shu yerga keladi.'
        : 'Mablag\u2018 hisobi hozircha o\u2018chiq. Tahlil sahifasida yozuv qo\u2018shsangiz, hisobot ochiladi.',
      '',
      'Ilovadagi AI murabbiy savollaringizga javob beradi. Bot esa faqat hisobingizdagi yangilanishlarni yuboradi.',
    ]
      .filter(Boolean)
      .join('\n');
  }
  return [
    '\u2705 G\u2018oya profili saqlandi.',
    input.idea ? `G\u2018oya: ${input.idea.slice(0, 180)}${input.idea.length > 180 ? '\u2026' : ''}` : '',
    input.product ? `Mahsulot: ${input.product}` : '',
    input.marketEntry ? `Bozorga chiqish: ${input.marketEntry.slice(0, 180)}` : '',
    '',
    'Keyingi qadamlar ilovadagi vazifalarda. AI: bozorga qanday chiqish, qayerdan olish, qayerda sotish.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatDailyCoachingTip(input: {
  path: string;
  stage: string;
  idea: string;
  product: string;
  marketEntry: string;
  tracksFinances: boolean;
  todayTurnover: number;
  todayCount: number;
  day: string;
}): string {
  const lines: string[] = [`\u{1F4CC} Kunlik yo\u2018nalish \u2014 ${input.day}`];
  if (input.path === 'OPERATING') {
    lines.push('Siz ishlab turgan biznes rejimidasiz.');
    if (input.product) lines.push(`Mahsulot/xizmat: ${input.product}`);
    if (input.tracksFinances) {
      if (input.todayCount > 0) {
        lines.push(
          `Bugungi aylanma (platforma): ${input.todayTurnover.toLocaleString('uz-UZ')} so\u2018m, ${input.todayCount} ta yozuv.`,
        );
        lines.push('X-hisobot Tahlilda. 20:00 dan keyin Z-hisobot yuboriladi.');
      } else {
        lines.push('Bugun hali kirim-chiqim yo\u2018q. Tahlilga yozing — hisobot shundan chiqadi.');
      }
    } else {
      lines.push('Mablag\u2018 hisobi o\u2018chiq. Yoqsangiz, X/Z va to\u2018lov eslatmalari keladi.');
    }
  } else {
    lines.push('Siz g\u2018oya bosqichidasiz.');
    if (input.idea) lines.push(`G\u2018oya: ${input.idea.slice(0, 140)}`);
    if (input.marketEntry) lines.push(`Bozorga chiqish: ${input.marketEntry.slice(0, 140)}`);
    lines.push('Bugun: 5 ta potentsial mijoz bilan gaplashing, 3 ta yetkazib beruvchidan narx oling.');
  }
  lines.push('', 'Bu shablon sizning profilingizdan. AI maslahati ilovada.');
  return lines.join('\n');
}

export function onboardingTasks(input: OnboardingSaveInput): { title: string; subtitle: string; category: string }[] {
  if (input.path === 'OPERATING') {
    const tasks = [
      input.tracksFinances
        ? { title: 'Bugungi savdo/xarajatni Tahlilga yozish', subtitle: 'X/Z hisobot shu yozuvlardan', category: 'planning' }
        : { title: 'Mablag‘ hisobini yoqish yoki birinchi yozuvni kiritish', subtitle: 'Tahlil sahifasi', category: 'planning' },
      input.product
        ? { title: `Asosiy mahsulotni kuzatish: ${input.product.slice(0, 80)}`, subtitle: input.location || '', category: 'supply' }
        : { title: 'Asosiy mahsulot/xizmatni aniqlash', subtitle: '', category: 'planning' },
    ];
    return tasks;
  }
  return [
    { title: '5 ta potentsial mijoz bilan suhbat', subtitle: input.targetCustomer || 'Maqsadli auditoriya', category: 'marketing' },
    {
      title: input.marketEntry ? `Bozorga chiqish: ${input.marketEntry.slice(0, 80)}` : 'Bozorga chiqish usulini yozish',
      subtitle: input.location || '',
      category: 'planning',
    },
    {
      title: input.product ? `Qayerdan olish: ${input.product.slice(0, 60)}` : 'Mahsulot manbasini aniqlash',
      subtitle: (input.suppliers || []).slice(0, 2).join(', '),
      category: 'supply',
    },
  ].slice(0, 3);
}

export type SurveyAnswers = {
  path?: string;
  industry?: string;
  product?: string;
  market?: string;
  legal?: string;
  finance?: string;
  notes?: string;
};

export type SurveyStep = {
  key: keyof SurveyAnswers;
  question: string;
  hint: string;
  buttons: string[];
};

export const SURVEY_STEPS: SurveyStep[] = [
  {
    key: 'path',
    question: 'Biznesingiz qaysi holatda?',
    hint: 'Tugmani bosing. Xohlasangiz, pastda o‘zingiz ham yozishingiz mumkin.',
    buttons: ['G‘oyam bor', 'Ishlab turgan biznes', 'Hali qidiryapman'],
  },
  {
    key: 'industry',
    question: 'Qaysi sohada ishlaysiz yoki ishlamoqchisiz?',
    hint: 'Asosiy yo‘nalishni tanlang.',
    buttons: ['Savdo', 'Xizmat', 'Ishlab chiqarish', 'Onlayn / yetkazib berish'],
  },
  {
    key: 'product',
    question: 'Qaysi mahsulot yoki xizmat asosiy?',
    hint: 'Nima olasiz yoki sotasaniz.',
    buttons: ['Oziq-ovqat', 'Qurilish materiali', 'Kiyim-kechak', 'Xizmat', 'Boshqa'],
  },
  {
    key: 'market',
    question: 'Bozorga qanday chiqasiz / qayerda sotasiz?',
    hint: 'Asosiy kanalni tanlang.',
    buttons: ['Do‘kon', 'Bozor', 'Telegram', 'Yetkazib berish', 'Aralash'],
  },
  {
    key: 'legal',
    question: 'Yuridik holatingiz qanday?',
    hint: 'Bu huquqiy eslatmalar uchun. Aniq maslahat — rasmiy organda.',
    buttons: ['YaTT', 'MChJ', 'Hali ro‘yxatdan o‘tmagan'],
  },
  {
    key: 'finance',
    question: 'Mablag‘ hisobini yuritasizmi?',
    hint: 'Ha bo‘lsa, X/Z hisobot va moliyaviy eslatmalar ochiladi.',
    buttons: ['Ha, yuritaman', 'Hali yo‘q'],
  },
];

export function parseSurveyAnswers(raw: string | null | undefined): SurveyAnswers {
  try {
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as SurveyAnswers) : {};
  } catch {
    return {};
  }
}

export function nextSurveyStep(answers: SurveyAnswers, currentStep: number): number {
  if (currentStep < SURVEY_STEPS.length - 1) return currentStep + 1;
  return SURVEY_STEPS.length;
}

export function isSurveyComplete(answers: SurveyAnswers): boolean {
  return SURVEY_STEPS.every((s) => Boolean((answers[s.key] || '').trim()));
}

export function profilePatchFromSurvey(answers: SurveyAnswers): {
  idea?: string;
  industry?: string;
  product?: string;
  salesChannels?: string[];
  stage?: string;
} {
  const path = answers.path || '';
  const stage =
    /ishlab turgan/i.test(path) ? 'EARLY_SALES' : /g['\u2018\u2019]oya/i.test(path) ? 'IDEA' : 'VALIDATION';
  const channels = answers.market ? [answers.market] : [];
  return {
    idea: answers.path || undefined,
    industry: answers.industry || undefined,
    product: answers.product || undefined,
    salesChannels: channels,
    stage,
  };
}

export function surveyTasks(answers: SurveyAnswers): { title: string; subtitle: string; category: string }[] {
  const tasks: { title: string; subtitle: string; category: string }[] = [];
  if (/o‘tmagan|otmagan|qidir/i.test(answers.legal || answers.path || '')) {
    tasks.push({
      title: 'YaTT/MChJ rejimini aniqlash',
      subtitle: 'my.gov.uz — bu kafolat emas, rasmiy tekshiring',
      category: 'tax',
    });
  }
  if (/yaTT/i.test(answers.legal || '')) {
    tasks.push({
      title: 'Soliq muddatini vazifalarda belgilash',
      subtitle: 'soliq.uz da tasdiqlang',
      category: 'tax',
    });
  }
  if (/yuritaman/i.test(answers.finance || '')) {
    tasks.push({
      title: 'Bugungi kirim-chiqimni Tahlilga yozish',
      subtitle: 'X/Z hisobot shu yozuvlardan',
      category: 'planning',
    });
  } else {
    tasks.push({
      title: 'Birinchi savdo yoki xarajatni yozish',
      subtitle: 'Tahlil sahifasi',
      category: 'planning',
    });
  }
  if (answers.market) {
    tasks.push({
      title: `Kanalni mustahkamlash: ${answers.market}`,
      subtitle: answers.product || '',
      category: 'marketing',
    });
  }
  return tasks.slice(0, 3);
}

export function formatTopicDigest(input: {
  day: string;
  answers: SurveyAnswers;
  todayTurnover: number;
  todayCount: number;
  overdueCount: number;
}): string {
  const a = input.answers;
  const legal =
    /yaTT/i.test(a.legal || '')
      ? 'Yuridik: YaTT belgilangan. Soliq muddati — soliq.uz / vazifalar. Summani uydirmaymiz.'
      : /MChJ/i.test(a.legal || '')
        ? 'Yuridik: MChJ belgilangan. Hisobot va soliq — buxgalter / rasmiy manba.'
        : 'Yuridik: ro‘yxatdan o‘tish hali yo‘q. YaTT/MChJ ni my.gov.uz da tekshiring.';

  const finance =
    input.todayCount > 0
      ? `Moliya (${input.day}): aylanma ${input.todayTurnover.toLocaleString('uz-UZ')} so‘m, ${input.todayCount} ta yozuv. X-hisobot Tahlilda.`
      : /yuritaman/i.test(a.finance || '')
        ? `Moliya: hisob yuritish yoqilgan, lekin bugun yozuv yo‘q. Tahlilga kirim-chiqim yozing.`
        : 'Moliya: hisob hali yuritilmayapti. Tahlilga yozuv qo‘shing — X/Z shundan chiqadi.';

  const economy = [
    a.product ? `Iqtisod/bozor: mahsulot — ${a.product}` : 'Iqtisod/bozor: mahsulot hali tanlanmagan.',
    a.market ? `Kanal — ${a.market}.` : '',
    a.industry ? `Soha — ${a.industry}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const overdue = input.overdueCount > 0 ? `Kechikkan vazifalar: ${input.overdueCount} ta.` : '';

  return [
    `\u{1F4CC} Kunlik eslatma — ${input.day}`,
    '',
    legal,
    finance,
    economy,
    overdue,
    '',
    'Raqamlar faqat sizning yozuvlaringizdan. AI tahlili ilovada; bot shablon eslatma yuboradi.',
  ]
    .filter((line) => line !== undefined)
    .join('\n');
}

export function defaultQuickReplies(stage: number): string[] {
  const step = SURVEY_STEPS[Math.min(Math.max(stage, 0), SURVEY_STEPS.length - 1)];
  if (step) return step.buttons.slice(0, 5);
  return ['G‘oyam bor', 'Ishlab turgan biznes', 'Tahlil', 'Biznes reja'];
}

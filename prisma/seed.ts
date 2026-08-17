import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  {
    name: 'Biznesni rivojlantirish krediti',
    bank: 'Biznesni rivojlantirish banki',
    amountMin: 25_000_000,
    amountMax: 200_000_000,
    interestRate: 22,
    termMonths: 24,
    gracePeriod: 3,
    collateral: 'Ko‘chmas mulk yoki uskuna',
    purposeTags: 'expansion,equipment',
    sourceUrl: 'https://brb.uz',
    sourceNote: 'Namuna stavka — brb.uz / bankda tasdiqlang',
  },
  {
    name: 'Aylanma mablag‘ krediti',
    bank: 'Kapitalbank',
    amountMin: 10_000_000,
    amountMax: 100_000_000,
    interestRate: 26,
    termMonths: 12,
    gracePeriod: 1,
    collateral: 'Tovar aylanmasi',
    purposeTags: 'working,inventory',
    sourceUrl: 'https://kapitalbank.uz',
    sourceNote: 'Namuna stavka — kapitalbank.uz da tasdiqlang',
  },
  {
    name: 'Mikro biznes krediti',
    bank: 'Mikrokreditbank',
    amountMin: 5_000_000,
    amountMax: 50_000_000,
    interestRate: 28,
    termMonths: 18,
    gracePeriod: 2,
    collateral: 'Garovsiz (kichik summa uchun)',
    purposeTags: 'startup,equipment,inventory',
    sourceUrl: 'https://mikrokreditbank.uz',
    sourceNote: 'Namuna stavka — mikrokreditbank.uz da tasdiqlang',
  },
  {
    name: 'Oilaviy tadbirkorlik dasturi',
    bank: 'Agrobank / oilakredit.uz',
    amountMin: 5_000_000,
    amountMax: 75_000_000,
    interestRate: 18,
    termMonths: 36,
    gracePeriod: 6,
    collateral: 'Dastur shartlariga muvofiq',
    purposeTags: 'startup,working,equipment,inventory',
    sourceUrl: 'https://oilakredit.uz',
    sourceNote: '«Har bir oila — tadbirkor» — oilakredit.uz da tasdiqlang',
  },
  {
    name: 'Xalq banki tadbirkorlik krediti',
    bank: 'Xalq banki',
    amountMin: 10_000_000,
    amountMax: 150_000_000,
    interestRate: 24,
    termMonths: 24,
    gracePeriod: 3,
    collateral: 'Garov / kafil',
    purposeTags: 'expansion,working,equipment',
    sourceUrl: 'https://xb.uz',
    sourceNote: 'Namuna — xb.uz da tasdiqlang',
  },
  {
    name: 'Raqamli mikroqarz (tez ariza)',
    bank: 'Uzum Bank',
    amountMin: 1_000_000,
    amountMax: 30_000_000,
    interestRate: 30,
    termMonths: 12,
    gracePeriod: 0,
    collateral: 'Garovsiz (limit ichida)',
    purposeTags: 'startup,working,inventory',
    sourceUrl: 'https://uzumbank.uz',
    sourceNote: 'Kichik summalar uchun tez ariza — rasmiy ilovada tasdiqlang',
  },
];

// Subscription plan starter values — DATA, not hardcoded in app code. Adjust
// here (or later via an admin-only API) without touching route/component
// code. Prices are in USD cents (priceCents / 100 = displayed dollar price).
const subscriptionPlans = [
  {
    key: 'FREE',
    name: 'Free',
    priceCents: 0,
    sortOrder: 0,
    aiMessagesPerDay: 50,
    voiceMinutesPerDay: 0,
    financialAnalysis: false,
    prioritySupport: false,
    features: [
      'Asosiy AI yordami',
      'Cheklangan xabarlar',
      'Asosiy biznes yo\u2018naltiruvi',
      'Asosiy g\u2018oya tahlili',
      'Kunlik cheklangan maslahat',
    ],
  },
  {
    key: 'BUSINESS',
    name: 'Business',
    priceCents: 500,
    sortOrder: 1,
    aiMessagesPerDay: 60,
    voiceMinutesPerDay: 0,
    financialAnalysis: false,
    prioritySupport: false,
    features: [
      'Ko\u2018proq AI foydalanish',
      'Biznes rejalashtirish',
      'G\u2018oyani tekshirish',
      'Bozor rejasi',
      'Kunlik vazifalar',
      'Supplier strategiyasi',
      'Sotuv strategiyasi',
      'Marketing rejalashtirish',
      'Biznes progress kuzatuvi',
    ],
  },
  {
    key: 'BUSINESS_PRO',
    name: 'Business Pro',
    priceCents: 1000,
    sortOrder: 2,
    aiMessagesPerDay: 150,
    voiceMinutesPerDay: 5,
    financialAnalysis: false,
    prioritySupport: true,
    features: [
      'Ilg\u2018or biznes tahlili',
      'Shaxsiylashtirilgan strategiya',
      'Kunlik biznes murabbiyligi',
      'Moliyani tashkil qilish asoslari',
      'Daromad/xarajat tahlili',
      'Biznes hisobotlari',
      'Ilg\u2018or rejalashtirish',
      'Ustuvor AI foydalanish',
    ],
  },
  {
    key: 'FINANCIAL',
    name: 'Financial',
    priceCents: 1500,
    sortOrder: 3,
    aiMessagesPerDay: 300,
    voiceMinutesPerDay: 15,
    financialAnalysis: true,
    prioritySupport: true,
    features: [
      'Daromad kuzatuvi',
      'Xarajat kuzatuvi',
      'Cash flow',
      'Budjet',
      'Moliyaviy toifalar',
      'Moliyaviy hisobotlar',
      'Soliq zaxirasi rejalashtirish',
      'Qarz kuzatuvi',
      'Kredit stsenariy tahlili',
      'Jamg\u2018arma rejalashtirish',
      'Moliyaviy maqsadlar',
      'Xarajat ogohlantirishlari',
      'Oylik moliyaviy xulosa',
    ],
  },
  {
    key: 'FINANCIAL_PRO',
    name: 'Financial Pro',
    priceCents: 3000,
    sortOrder: 4,
    aiMessagesPerDay: 1000,
    voiceMinutesPerDay: 30,
    financialAnalysis: true,
    prioritySupport: true,
    features: [
      'Ilg\u2018or moliyaviy analitika',
      'Biznes moliyaviy dashboard',
      'Cash flow prognozi',
      'Stsenariy rejalashtirish',
      'Ilg\u2018or hisobotlar',
      'Moliyaviy salomatlik balli',
      'Biznes o\u2018sish rejasi',
      'Ko\u2018p-biznesli qo\u2018llab-quvvatlash',
      'Ilg\u2018or AI murabbiylik',
      'Ilg\u2018or moliyaviy tushunchalar',
    ],
  },
];

async function seedSubscriptionPlans() {
  for (const plan of subscriptionPlans) {
    await prisma.subscriptionPlan.upsert({
      where: { key: plan.key },
      update: {
        name: plan.name,
        priceCents: plan.priceCents,
        sortOrder: plan.sortOrder,
        aiMessagesPerDay: plan.aiMessagesPerDay,
        voiceMinutesPerDay: plan.voiceMinutesPerDay,
        financialAnalysis: plan.financialAnalysis,
        prioritySupport: plan.prioritySupport,
        features: JSON.stringify(plan.features),
        active: true,
      },
      create: {
        key: plan.key,
        name: plan.name,
        priceCents: plan.priceCents,
        currency: 'USD',
        interval: 'month',
        sortOrder: plan.sortOrder,
        aiMessagesPerDay: plan.aiMessagesPerDay,
        voiceMinutesPerDay: plan.voiceMinutesPerDay,
        financialAnalysis: plan.financialAnalysis,
        prioritySupport: plan.prioritySupport,
        features: JSON.stringify(plan.features),
      },
    });
  }
  console.log(`Subscription plans upserted: ${subscriptionPlans.length}`);
}

async function main() {
  await seedSubscriptionPlans();
  for (const p of products) {
    const existing = await prisma.creditProduct.findFirst({
      where: { name: p.name, bank: p.bank },
    });
    if (existing) {
      await prisma.creditProduct.update({
        where: { id: existing.id },
        data: {
          interestRate: p.interestRate,
          sourceUrl: p.sourceUrl,
          sourceNote: p.sourceNote,
          lastVerifiedAt: new Date(),
          active: true,
        },
      });
    } else {
      await prisma.creditProduct.create({
        data: {
          name: p.name,
          bank: p.bank,
          amountMin: p.amountMin,
          amountMax: p.amountMax,
          interestRate: p.interestRate,
          termMonths: p.termMonths,
          gracePeriod: p.gracePeriod,
          collateral: p.collateral,
          purposeTags: p.purposeTags,
          sourceNote: p.sourceNote,
          sourceUrl: p.sourceUrl,
          lastVerifiedAt: new Date(),
        },
      });
    }
  }
  console.log(`Credit catalog upserted: ${products.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

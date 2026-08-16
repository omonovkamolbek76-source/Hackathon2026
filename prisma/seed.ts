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

async function main() {
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

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
  },
  {
    name: 'Oilaviy tadbirkorlik dasturi (namuna)',
    bank: 'Agrobank / oilakredit.uz',
    amountMin: 5_000_000,
    amountMax: 75_000_000,
    interestRate: 18,
    termMonths: 36,
    gracePeriod: 6,
    collateral: 'Dastur shartlariga muvofiq',
    purposeTags: 'startup,working,equipment,inventory',
    sourceNote:
      '«Har bir oila — tadbirkor» yo‘nalishi — stavka/shartlarni oilakredit.uz da tasdiqlang',
  },
];

async function main() {
  const count = await prisma.creditProduct.count();
  if (count === 0) {
    for (const p of products) {
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
          sourceNote:
            'sourceNote' in p && p.sourceNote
              ? p.sourceNote
              : 'Illustrative catalog — verify on official bank / oilakredit.uz',
        },
      });
    }
    console.log(`Seeded ${products.length} credit products`);
  } else {
    console.log(`Credit products already present (${count})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

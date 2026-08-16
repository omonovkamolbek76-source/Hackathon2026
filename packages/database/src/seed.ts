import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { normalizeProvider, SeedMarketProvider } from "./providers";

const prisma = new PrismaClient();

async function main() {
  const provider = new SeedMarketProvider();
  const raw = await provider.fetch();
  const snapshot = normalizeProvider(raw);

  await prisma.reviewAnalysis.deleteMany();
  await prisma.review.deleteMany();
  await prisma.supplierProduct.deleteMany();
  await prisma.marketDemand.deleteMany();
  await prisma.marketPrice.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.product.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.aiDecisionLog.deleteMany();
  await prisma.aiMessage.deleteMany();
  await prisma.aiTask.deleteMany();
  await prisma.aiConversation.deleteMany();
  await prisma.businessHealthScore.deleteMany();
  await prisma.financialRecord.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.businessPlan.deleteMany();
  await prisma.creditProfile.deleteMany();
  await prisma.riskSignal.deleteMany();
  await prisma.businessProfile.deleteMany();
  await prisma.embedding.deleteMany();
  await prisma.businessDocument.deleteMany();
  await prisma.business.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  const products = [];
  for (const p of snapshot.data.products) {
    products.push(
      await prisma.product.create({
        data: p,
      }),
    );
  }
  const bySlug = Object.fromEntries(products.map((p) => [p.slug, p]));

  for (const price of snapshot.data.prices) {
    await prisma.marketPrice.create({
      data: {
        productId: bySlug[price.slug].id,
        region: price.region,
        avgPrice: price.avg,
        minPrice: price.min,
        maxPrice: price.max,
        source: snapshot.source,
        collectedAt: snapshot.collectedAt,
        confidence: snapshot.confidence,
      },
    });
  }

  for (const d of snapshot.data.demand) {
    await prisma.marketDemand.create({
      data: {
        productId: bySlug[d.slug].id,
        region: d.region,
        demandScore: d.score,
        changePct: d.changePct,
        seasonal: d.seasonal,
        source: snapshot.source,
        collectedAt: snapshot.collectedAt,
        confidence: snapshot.confidence,
      },
    });
  }

  for (const s of snapshot.data.suppliers) {
    const supplier = await prisma.supplier.create({
      data: {
        name: s.name,
        region: s.region,
        reliability: s.reliability,
        quality: s.quality,
        source: snapshot.source,
      },
    });
    for (const offer of s.offers) {
      await prisma.supplierProduct.create({
        data: {
          supplierId: supplier.id,
          productId: bySlug[offer.slug].id,
          unitPrice: offer.unitPrice,
          delivery: offer.delivery,
          taxes: offer.taxes,
          transaction: offer.transaction,
          expectedRisk: offer.expectedRisk,
          capacityMonthly: offer.capacityMonthly,
          collectedAt: snapshot.collectedAt,
          source: snapshot.source,
          confidence: snapshot.confidence,
        },
      });
    }
  }

  const adminHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeAdmin1!", 10);
  const demoHash = await bcrypt.hash(process.env.SEED_DEMO_PASSWORD ?? "Demo1234!", 10);

  const admin = await prisma.user.create({
    data: {
      email: process.env.SEED_ADMIN_EMAIL ?? "admin@businessos.uz",
      passwordHash: adminHash,
      fullName: "Chamber Admin",
      role: "ADMIN",
      language: "uz",
    },
  });

  const demo = await prisma.user.create({
    data: {
      email: process.env.SEED_DEMO_EMAIL ?? "tadbirkor@businessos.uz",
      passwordHash: demoHash,
      fullName: "Aziz Qarshiyev",
      role: "ENTREPRENEUR",
      language: "uz",
    },
  });

  const business = await prisma.business.create({
    data: {
      ownerId: demo.id,
      name: "Nasaf Savdo",
      profile: {
        create: {
          industry: "Wholesale Trade",
          region: "Qarshi",
          productsJson: JSON.stringify(["cement", "flour"]),
          monthlyRevenueSom: 180_000_000,
          monthlyExpenseSom: 142_000_000,
          employees: 12,
          goals: "Yangi mahsulot liniyasi va aylanma kapital",
          onboardingText: "Qarshida optom savdo qilaman, asosan qurilish va oziq-ovqat.",
        },
      },
    },
  });

  const months = ["2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"];
  const revenues = [165, 170, 174, 168, 176, 180].map((n) => n * 1_000_000);
  const expenses = [130, 134, 138, 140, 141, 142].map((n) => n * 1_000_000);
  for (let i = 0; i < months.length; i++) {
    await prisma.financialRecord.create({
      data: {
        businessId: business.id,
        month: months[i],
        revenueSom: revenues[i],
        expenseSom: expenses[i],
      },
    });
  }

  await prisma.notification.createMany({
    data: [
      {
        userId: demo.id,
        title: "Sement narxi pasaydi",
        body: "Siz xarid qiladigan sementning Qarshi taklifi 8% arzonlashdi. Hozir xarid qilish foydaliroq bo‘lishi mumkin.",
      },
      {
        userId: demo.id,
        title: "Hududingizda talab oshmoqda",
        body: "Qarshida sementga talab +12%. Keyingi 30 kunda ehtimol yuqori.",
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "SEED",
      meta: JSON.stringify({ source: snapshot.source, collectedAt: snapshot.collectedAt }),
    },
  });

  console.log("Seeded BusinessOS AI dataset");
  console.log("Admin:", admin.email);
  console.log("Demo:", demo.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

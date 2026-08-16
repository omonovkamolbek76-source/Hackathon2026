import { extractEntities, rankOffers, rankOpportunities } from "@businessos/shared";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const query =
    "Men 200 mln so‘mlik mahsulot olib kelib sotmoqchiman. Qaysi mahsulotni olish foydaliroq?";
  const first = extractEntities(query);
  if (first.intent !== "PROFITABILITY") throw new Error("intent failed");
  if (!first.missing.includes("region")) throw new Error("should ask region");

  const second = extractEntities(`${query}\nQarshi`);
  if (second.region !== "Qarshi") throw new Error("region extract failed");

  const cement = await prisma.product.findUnique({
    where: { slug: "cement" },
    include: { offers: { include: { supplier: true } } },
  });
  if (!cement?.offers.length) throw new Error("seed missing cement offers");

  const ranked = rankOffers(
    cement.offers.map((o) => ({
      supplierId: o.supplierId,
      supplierName: o.supplier.name,
      product: "cement",
      region: o.supplier.region,
      unitPriceSom: o.unitPrice,
      deliverySom: o.delivery,
      taxesSom: o.taxes,
      transactionSom: o.transaction,
      expectedRiskSom: o.expectedRisk,
      quality: o.supplier.quality,
      reliability: o.supplier.reliability,
      source: o.source,
      updatedAt: o.collectedAt.toISOString(),
    })),
  );
  if (ranked[0].totalCostSom <= 0) throw new Error("total cost missing");

  const opps = rankOpportunities([
    {
      product: "cement",
      demandScore: 91,
      demandChangePct: 12,
      estimatedMarginPct: 24,
      requiredCapitalSom: 160_000_000,
      budgetSom: 200_000_000,
    },
    {
      product: "flour",
      demandScore: 87,
      demandChangePct: 9,
      estimatedMarginPct: 31,
      requiredCapitalSom: 180_000_000,
      budgetSom: 200_000_000,
    },
    {
      product: "cotton-oil",
      demandScore: 74,
      demandChangePct: 3,
      estimatedMarginPct: 38,
      requiredCapitalSom: 216_000_000,
      budgetSom: 200_000_000,
    },
  ]);
  if (opps[0].product !== "flour") throw new Error("wow-moment ranking drifted");

  console.log("MVP verify OK", {
    intent: first.intent,
    bestCement: ranked[0].supplierName,
    recommended: opps[0].product,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

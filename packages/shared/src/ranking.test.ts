import { describe, expect, it } from "vitest";
import { rankOffers, rankOpportunities, totalCost } from "./ranking";

describe("ranking", () => {
  it("uses total cost not sticker price", () => {
    expect(
      totalCost({
        productPrice: 100,
        delivery: 20,
        taxes: 10,
        transactionCosts: 5,
        expectedRisk: 8,
      }),
    ).toBe(143);
  });

  it("ranks cheaper reliable supplier higher than cheap risky one", () => {
    const ranked = rankOffers([
      {
        supplierId: "a",
        supplierName: "A",
        product: "cement",
        region: "Qarshi",
        unitPriceSom: 90_000,
        deliverySom: 5_000,
        taxesSom: 2_000,
        transactionSom: 1_000,
        expectedRiskSom: 20_000,
        quality: 60,
        reliability: 55,
        source: "seed",
        updatedAt: "2026-08-16",
      },
      {
        supplierId: "b",
        supplierName: "B",
        product: "cement",
        region: "Qarshi",
        unitPriceSom: 100_000,
        deliverySom: 3_000,
        taxesSom: 2_000,
        transactionSom: 1_000,
        expectedRiskSom: 2_000,
        quality: 90,
        reliability: 92,
        source: "seed",
        updatedAt: "2026-08-16",
      },
    ]);
    expect(ranked[0].supplierId).toBe("b");
  });

  it("recommends balanced opportunity inside budget", () => {
    const ranked = rankOpportunities([
      {
        product: "A",
        demandScore: 91,
        demandChangePct: 11,
        estimatedMarginPct: 24,
        requiredCapitalSom: 160_000_000,
        budgetSom: 200_000_000,
      },
      {
        product: "B",
        demandScore: 87,
        demandChangePct: 9,
        estimatedMarginPct: 31,
        requiredCapitalSom: 180_000_000,
        budgetSom: 200_000_000,
      },
      {
        product: "C",
        demandScore: 74,
        demandChangePct: 4,
        estimatedMarginPct: 38,
        requiredCapitalSom: 210_000_000,
        budgetSom: 200_000_000,
      },
    ]);
    expect(ranked[0].product).toBe("B");
    expect(ranked[0].recommended).toBe(true);
    expect(ranked.find((x) => x.product === "C")?.capitalFit).toBe(false);
  });
});

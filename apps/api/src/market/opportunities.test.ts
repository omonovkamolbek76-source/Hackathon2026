import { describe, expect, it } from "vitest";
import { rankOpportunities } from "@businessos/shared";

describe("api market ranking contract", () => {
  it("keeps the hackathon wow-moment order", () => {
    const ranked = rankOpportunities([
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
    expect(ranked[0].product).toBe("flour");
    expect(ranked[0].recommended).toBe(true);
  });
});

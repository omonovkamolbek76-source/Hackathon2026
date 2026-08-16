import { describe, expect, it } from "vitest";
import { buildFinanceModel, creditReadiness, monthlyPayment } from "./finance";

describe("finance", () => {
  it("builds a consistent model", () => {
    const model = buildFinanceModel({
      capexSom: 200_000_000,
      monthlyRevenueSom: 40_000_000,
      monthlyOpexSom: 28_000_000,
      unitPriceSom: 120_000,
      unitCostSom: 90_000,
    });
    expect(model.netProfitMonthlySom).toBe(12_000_000);
    expect(model.paybackMonths).toBe(17);
    expect(model.roiAnnualPct).toBeGreaterThan(70);
    expect(model.breakEvenUnits).toBe(Math.ceil(28_000_000 / 30_000));
    expect(model.cashFlow).toHaveLength(12);
  });

  it("calculates annuity payment", () => {
    const pmt = monthlyPayment(100_000_000, 24, 12);
    expect(pmt).toBeGreaterThan(9_000_000);
    expect(pmt).toBeLessThan(11_000_000);
  });

  it("flags weak credit dimensions", () => {
    const result = creditReadiness({
      revenueStability: 82,
      cashFlow: 74,
      debtLoad: 81,
      businessPlan: 90,
      marketDemand: 76,
      risk: 65,
    });
    expect(result.score).toBe(78);
    expect(result.improvements).toContain("Risk");
    expect(result.improvements.length).toBeLessThanOrEqual(3);
  });
});

import type { DemandTone, ProductOpportunity, RiskLevel, SupplierOffer } from "./types";

export function totalCost(input: {
  productPrice: number;
  delivery: number;
  taxes: number;
  transactionCosts: number;
  expectedRisk: number;
}): number {
  return (
    input.productPrice +
    input.delivery +
    input.taxes +
    input.transactionCosts +
    input.expectedRisk
  );
}

export function rankOffers(
  offers: Array<Omit<SupplierOffer, "totalCostSom" | "matchScore">>,
): SupplierOffer[] {
  const withCost = offers.map((o) => ({
    ...o,
    totalCostSom: totalCost({
      productPrice: o.unitPriceSom,
      delivery: o.deliverySom,
      taxes: o.taxesSom,
      transactionCosts: o.transactionSom,
      expectedRisk: o.expectedRiskSom,
    }),
    matchScore: 0,
  }));
  const maxCost = Math.max(...withCost.map((o) => o.totalCostSom), 1);
  return withCost
    .map((o) => {
      const costScore = 1 - o.totalCostSom / maxCost;
      const match =
        costScore * 45 + (o.quality / 100) * 25 + (o.reliability / 100) * 25 - (o.expectedRiskSom / o.totalCostSom) * 20;
      return { ...o, matchScore: Number(Math.max(0, Math.min(99, match)).toFixed(1)) };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function demandTone(changePct: number): DemandTone {
  if (changePct >= 8) return "RISING";
  if (changePct <= -8) return "FALLING";
  if (changePct < 0) return "CAUTION";
  return "STABLE";
}

export function riskFromMarginAndDemand(marginPct: number, demandScore: number): RiskLevel {
  if (marginPct >= 35 && demandScore < 70) return "HIGH";
  if (marginPct >= 28 || demandScore < 75) return "MEDIUM";
  return "LOW";
}

export function rankOpportunities(
  items: Array<{
    product: string;
    demandScore: number;
    demandChangePct: number;
    estimatedMarginPct: number;
    requiredCapitalSom: number;
    budgetSom: number;
  }>,
): ProductOpportunity[] {
  return items
    .map((item) => {
      const risk = riskFromMarginAndDemand(item.estimatedMarginPct, item.demandScore);
      const capitalFit = item.requiredCapitalSom <= item.budgetSom;
      const score =
        item.demandScore * 0.4 +
        item.estimatedMarginPct * 1.4 +
        (capitalFit ? 12 : -15) +
        (risk === "LOW" ? 10 : risk === "MEDIUM" ? 4 : -8);
      const why = [
        `Talab: ${item.demandScore}/100 (${item.demandChangePct > 0 ? "+" : ""}${item.demandChangePct}%)`,
        `Marja: ${item.estimatedMarginPct}%`,
        `Risk: ${risk}`,
        capitalFit ? "Kapital talabi byudjetga mos" : "Kapital talabi byudjetdan yuqori",
      ];
      return {
        product: item.product,
        demandScore: item.demandScore,
        demandTone: demandTone(item.demandChangePct),
        estimatedMarginPct: item.estimatedMarginPct,
        risk,
        capitalFit,
        recommended: false,
        why,
        _score: score,
      };
    })
    .sort((a, b) => b._score - a._score)
    .map((item, i) => {
      const { _score, ...rest } = item;
      void _score;
      return { ...rest, recommended: i === 0 && rest.capitalFit };
    });
}

export function savingsVsMedian(bestTotal: number, medianTotal: number): number {
  return Math.max(0, Math.round(medianTotal - bestTotal));
}

export function buySignal(price: number, average: number, demandChangePct: number): "BUY" | "WAIT" | "NEGOTIATE" {
  const delta = ((price - average) / average) * 100;
  if (delta <= -7 && demandChangePct >= 0) return "BUY";
  if (delta >= 8) return "WAIT";
  return "NEGOTIATE";
}

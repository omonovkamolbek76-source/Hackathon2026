import type { CreditReadiness, FinanceModel, HealthResult } from "./types";

export function buildFinanceModel(input: {
  capexSom: number;
  monthlyRevenueSom: number;
  monthlyOpexSom: number;
  unitPriceSom?: number;
  unitCostSom?: number;
  months?: number;
}): FinanceModel {
  const months = input.months ?? 12;
  const gross = input.monthlyRevenueSom - (input.unitCostSom && input.unitPriceSom
    ? Math.round(input.monthlyRevenueSom * (input.unitCostSom / input.unitPriceSom))
    : Math.round(input.monthlyOpexSom * 0.55));
  const net = input.monthlyRevenueSom - input.monthlyOpexSom;
  const unitPrice = input.unitPriceSom ?? 0;
  const unitCost = input.unitCostSom ?? 0;
  const contribution = unitPrice - unitCost;
  const breakEvenUnits =
    contribution > 0 ? Math.ceil(input.monthlyOpexSom / contribution) : 0;
  const annualNet = net * 12;
  const roi = input.capexSom > 0 ? (annualNet / input.capexSom) * 100 : 0;
  const payback = net > 0 ? Math.ceil(input.capexSom / net) : 99;
  const cashFlow = Array.from({ length: months }, (_, i) => {
    const start = i === 0 ? -input.capexSom : 0;
    return start + net * (i + 1);
  });

  return {
    capexSom: input.capexSom,
    opexMonthlySom: input.monthlyOpexSom,
    revenueMonthlySom: input.monthlyRevenueSom,
    grossProfitMonthlySom: gross,
    netProfitMonthlySom: net,
    breakEvenUnits,
    roiAnnualPct: Number(roi.toFixed(1)),
    paybackMonths: payback,
    cashFlow,
  };
}

export function monthlyPayment(principal: number, annualRatePct: number, months: number): number {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export function creditReadiness(input: {
  revenueStability: number;
  cashFlow: number;
  debtLoad: number;
  businessPlan: number;
  marketDemand: number;
  risk: number;
}): CreditReadiness {
  const breakdown = [
    { label: "Revenue Stability", score: input.revenueStability },
    { label: "Cash Flow", score: input.cashFlow },
    { label: "Debt Load", score: input.debtLoad },
    { label: "Business Plan", score: input.businessPlan },
    { label: "Market Demand", score: input.marketDemand },
    { label: "Risk", score: input.risk },
  ];
  const score = Math.round(
    breakdown.reduce((s, x) => s + x.score, 0) / breakdown.length,
  );
  const improvements = breakdown
    .filter((x) => x.score < 75)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((x) => x.label);
  return { score, breakdown, improvements };
}

export function businessHealth(input: {
  financial: number;
  market: number;
  demand: number;
  cashFlow: number;
  customer: number;
  risk: number;
  operations: number;
}): HealthResult {
  const breakdown = [
    { label: "Financial Health", score: input.financial },
    { label: "Market Position", score: input.market },
    { label: "Demand", score: input.demand },
    { label: "Cash Flow", score: input.cashFlow },
    { label: "Customer Activity", score: input.customer },
    { label: "Risk", score: 100 - input.risk },
    { label: "Operational Stability", score: input.operations },
  ];
  const score = Math.round(breakdown.reduce((s, x) => s + x.score, 0) / breakdown.length);
  const status = score >= 75 ? "HEALTHY" : score >= 55 ? "WATCH" : "CRITICAL";
  const weakest = [...breakdown].sort((a, b) => a.score - b.score)[0];
  const summary =
    status === "HEALTHY"
      ? `Biznes barqaror. Asosiy e’tibor — ${weakest.label}.`
      : status === "WATCH"
        ? `Nazorat kerak. Eng zaif nuqta — ${weakest.label}.`
        : `Jiddiy xavf. Avval ${weakest.label} ni tiklang.`;
  return { score, status, breakdown, summary };
}

export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

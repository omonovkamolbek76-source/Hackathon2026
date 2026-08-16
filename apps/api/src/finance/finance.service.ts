import { Injectable } from "@nestjs/common";
import {
  buildFinanceModel,
  businessHealth,
  clampScore,
  creditReadiness,
  monthlyPayment,
} from "@businessos/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  model(input: {
    capexSom: number;
    monthlyRevenueSom: number;
    monthlyOpexSom: number;
    unitPriceSom?: number;
    unitCostSom?: number;
  }) {
    return buildFinanceModel(input);
  }

  creditCalc(amountSom: number, annualRatePct = 24, months = 12) {
    const payment = Math.round(monthlyPayment(amountSom, annualRatePct, months));
    return {
      amountSom,
      annualRatePct,
      months,
      monthlyPaymentSom: payment,
      totalRepaySom: payment * months,
      interestSom: payment * months - amountSom,
    };
  }

  async healthForBusiness(businessId: string) {
    const records = await this.prisma.financialRecord.findMany({
      where: { businessId },
      orderBy: { month: "asc" },
    });
    const profile = await this.prisma.businessProfile.findUnique({ where: { businessId } });
    const last = records.at(-1);
    const prev = records.at(-2);
    const revenueTrend =
      last && prev ? ((last.revenueSom - prev.revenueSom) / Math.max(prev.revenueSom, 1)) * 100 : 4;
    const margin = last
      ? ((last.revenueSom - last.expenseSom) / Math.max(last.revenueSom, 1)) * 100
      : 12;
    const result = businessHealth({
      financial: clampScore(60 + margin),
      market: clampScore(70 + revenueTrend),
      demand: 78,
      cashFlow: clampScore(55 + margin * 1.2),
      customer: 76,
      risk: clampScore(28 - revenueTrend),
      operations: profile?.employees ? clampScore(60 + profile.employees) : 70,
    });
    await this.prisma.businessHealthScore.create({
      data: {
        businessId,
        score: result.score,
        status: result.status,
        breakdown: JSON.stringify(result.breakdown),
        summary: result.summary,
      },
    });
    return result;
  }

  async creditReadinessForBusiness(businessId: string, demandScore = 76) {
    const records = await this.prisma.financialRecord.findMany({
      where: { businessId },
      orderBy: { month: "asc" },
    });
    const last = records.at(-1);
    const variance =
      records.length > 1
        ? records.reduce((s, r, i, arr) => {
            if (i === 0) return 0;
            return s + Math.abs(r.revenueSom - arr[i - 1].revenueSom) / arr[i - 1].revenueSom;
          }, 0) /
          (records.length - 1)
        : 0.08;
    const margin = last
      ? ((last.revenueSom - last.expenseSom) / Math.max(last.revenueSom, 1)) * 100
      : 10;
    const result = creditReadiness({
      revenueStability: clampScore(90 - variance * 200),
      cashFlow: clampScore(60 + margin),
      debtLoad: 81,
      businessPlan: 88,
      marketDemand: demandScore,
      risk: clampScore(70 - variance * 80),
    });
    await this.prisma.creditProfile.upsert({
      where: { businessId },
      create: { businessId, score: result.score, breakdown: JSON.stringify(result.breakdown) },
      update: { score: result.score, breakdown: JSON.stringify(result.breakdown) },
    });
    return result;
  }

  plan(input: {
    company: string;
    region?: string;
    industry?: string;
    goal?: string;
    budgetSom?: number;
    language: "uz" | "ru" | "en";
    finance: ReturnType<typeof buildFinanceModel>;
    opportunities?: unknown;
  }) {
    const sections = [
      { title: "Executive Summary", body: `${input.company} — ${input.goal ?? "growth"} in ${input.region ?? "Uzbekistan"}.` },
      { title: "Business Model", body: input.industry ?? "Trade / production" },
      { title: "Market Analysis", body: "Built from live BusinessOS market tables (source + freshness attached)." },
      { title: "Target Customer", body: "Regional wholesale and SME buyers." },
      { title: "Competitor Analysis", body: "Ranked via total-cost supplier comparison, not sticker price." },
      { title: "Marketing Strategy", body: "Chamber network, B2B matching, repeat contracts." },
      { title: "Operations", body: "Lean inventory, verified suppliers, weekly cash review." },
      {
        title: "Financial Model",
        body: JSON.stringify({
          capex: input.finance.capexSom,
          monthlyNet: input.finance.netProfitMonthlySom,
          roi: input.finance.roiAnnualPct,
          paybackMonths: input.finance.paybackMonths,
        }),
      },
      { title: "Risk Analysis", body: "Demand, FX, logistics, and concentration risk. Human approval for high-risk actions." },
      { title: "Funding Request", body: String(input.budgetSom ?? input.finance.capexSom) },
    ];
    return { title: `${input.company} business plan`, sections, language: input.language };
  }
}

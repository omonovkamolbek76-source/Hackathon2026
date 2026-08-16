import { Injectable } from "@nestjs/common";
import {
  formatCompactSom,
  productLabel,
  rankOpportunities,
  type ExtractedEntities,
  type Language,
} from "@businessos/shared";
import { FinanceService } from "../finance/finance.service";
import { MarketService } from "../market/market.service";
import { PrismaService } from "../prisma/prisma.service";

export interface ToolResult {
  name: string;
  ok: boolean;
  data: unknown;
}

@Injectable()
export class ToolsService {
  constructor(
    private readonly market: MarketService,
    private readonly finance: FinanceService,
    private readonly prisma: PrismaService,
  ) {}

  async run(names: string[], entities: ExtractedEntities, businessId?: string): Promise<ToolResult[]> {
    const out: ToolResult[] = [];
    for (const name of names) {
      try {
        const data = await this.dispatch(name, entities, businessId);
        out.push({ name, ok: true, data });
      } catch (error) {
        out.push({
          name,
          ok: false,
          data: { error: error instanceof Error ? error.message : "tool_failed" },
        });
      }
    }
    return out;
  }

  private async dispatch(name: string, entities: ExtractedEntities, businessId?: string) {
    switch (name) {
      case "search_market_data":
        return this.market.search(entities.product, entities.region);
      case "compare_prices":
        if (!entities.product) return { missing: "product" };
        return this.market.compare(entities.product, entities.region);
      case "search_suppliers":
        if (!entities.product) return { missing: "product" };
        return this.market.compare(entities.product, entities.region);
      case "calculate_logistics":
        return {
          from: entities.region ?? "Toshkent",
          note: "Delivery already included in supplier total-cost rows",
        };
      case "analyze_demand":
        return this.market.demand(entities.product, entities.region);
      case "recommend_products":
        return this.recommend(entities);
      case "calculate_profit":
        return this.profit(entities);
      case "calculate_credit":
        return this.finance.creditCalc(
          entities.creditAmountSom ?? entities.budgetSom ?? 100_000_000,
          24,
          entities.termMonths ?? 12,
        );
      case "calculate_credit_readiness":
        if (!businessId) return { missing: "business" };
        return this.finance.creditReadinessForBusiness(businessId);
      case "calculate_business_health":
        if (!businessId) return { missing: "business" };
        return this.finance.healthForBusiness(businessId);
      case "generate_business_plan":
        return this.plan(entities, businessId);
      case "analyze_reviews":
        return this.reviews(businessId);
      default:
        return { unsupported: name };
    }
  }

  private async recommend(entities: ExtractedEntities) {
    const region = entities.region ?? "Qarshi";
    const budget = entities.budgetSom ?? 200_000_000;
    const rows = await this.market.opportunities(region, budget, entities.language);
    const ranked = rankOpportunities(
      rows.map((r) => ({
        product: r.product,
        demandScore: r.demandScore,
        demandChangePct: r.demandChangePct,
        estimatedMarginPct: r.estimatedMarginPct,
        requiredCapitalSom: r.requiredCapitalSom,
        budgetSom: budget,
      })),
    );
    return {
      region,
      budgetSom: budget,
      items: ranked.map((item) => {
        const extra = rows.find((r) => r.product === item.product);
        return {
          ...item,
          label: productLabel(item.product, entities.language),
          source: extra?.source,
          collectedAt: extra?.collectedAt,
          confidence: extra?.confidence,
          bestSupplier: extra?.bestSupplier,
        };
      }),
    };
  }

  private profit(entities: ExtractedEntities) {
    const capex = entities.budgetSom ?? entities.creditAmountSom ?? 200_000_000;
    return this.finance.model({
      capexSom: capex,
      monthlyRevenueSom: Math.round(capex * 0.2),
      monthlyOpexSom: Math.round(capex * 0.14),
    });
  }

  private async plan(entities: ExtractedEntities, businessId?: string) {
    const business = businessId
      ? await this.prisma.business.findUnique({
          where: { id: businessId },
          include: { profile: true },
        })
      : null;
    const finance = this.profit(entities);
    return this.finance.plan({
      company: business?.name ?? "Biznes",
      region: entities.region ?? business?.profile?.region ?? undefined,
      industry: business?.profile?.industry ?? undefined,
      goal: business?.profile?.goals ?? entities.intent,
      budgetSom: entities.budgetSom ?? entities.creditAmountSom,
      language: entities.language,
      finance,
    });
  }

  private async reviews(businessId?: string) {
    const reviews = await this.prisma.review.findMany({
      where: businessId ? { businessId } : undefined,
      include: { analysis: true },
      take: 50,
    });
    const suspicious = reviews.filter((r) => r.analysis?.suspicious).length;
    const score = reviews.length
      ? Math.round(100 - (suspicious / reviews.length) * 40)
      : 0;
    return {
      realQuality: score,
      verified: reviews.length - suspicious,
      suspicious,
      note: "Quality score is analytical, not a legal verdict.",
    };
  }

  summarizeBudget(language: Language, som: number) {
    return formatCompactSom(som, language);
  }
}

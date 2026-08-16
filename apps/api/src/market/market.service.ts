import { Injectable } from "@nestjs/common";
import {
  buySignal,
  formatSom,
  productLabel,
  rankOffers,
  savingsVsMedian,
  type Language,
} from "@businessos/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MarketService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query?: string, region?: string) {
    const products = await this.prisma.product.findMany({
      where: query
        ? {
            OR: [
              { slug: { contains: query.toLowerCase() } },
              { nameUz: { contains: query } },
              { nameRu: { contains: query } },
              { nameEn: { contains: query } },
            ],
          }
        : undefined,
      include: {
        prices: region ? { where: { region } } : true,
        demand: region ? { where: { region } } : true,
      },
    });
    return products.map((p) => ({
      slug: p.slug,
      nameUz: p.nameUz,
      nameRu: p.nameRu,
      nameEn: p.nameEn,
      unit: p.unit,
      prices: p.prices.map((x) => ({
        region: x.region,
        avg: x.avgPrice,
        min: x.minPrice,
        max: x.maxPrice,
        source: x.source,
        collectedAt: x.collectedAt,
        updatedAt: x.updatedAt,
        confidence: x.confidence,
      })),
      demand: p.demand.map((x) => ({
        region: x.region,
        score: x.demandScore,
        changePct: x.changePct,
        seasonal: x.seasonal,
        source: x.source,
        collectedAt: x.collectedAt,
        confidence: x.confidence,
      })),
    }));
  }

  async compare(productSlug: string, region?: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug: productSlug },
      include: {
        prices: region ? { where: { region } } : true,
        offers: {
          where: region ? { supplier: { region } } : undefined,
          include: { supplier: true, product: true },
        },
      },
    });
    if (!product) return { product: productSlug, offers: [], market: null };

    const raw = product.offers.map((o) => ({
      supplierId: o.supplierId,
      supplierName: o.supplier.name,
      product: product.slug,
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
    }));
    const offers = rankOffers(raw);
    const totals = offers.map((o) => o.totalCostSom).sort((a, b) => a - b);
    const median = totals[Math.floor(totals.length / 2)] ?? 0;
    const avg = product.prices[0]?.avgPrice ?? median;
    const best = offers[0];
    return {
      product: product.slug,
      unit: product.unit,
      market: product.prices[0]
        ? {
            avg: product.prices[0].avgPrice,
            min: product.prices[0].minPrice,
            max: product.prices[0].maxPrice,
            source: product.prices[0].source,
            collectedAt: product.prices[0].collectedAt,
            confidence: product.prices[0].confidence,
          }
        : null,
      offers,
      best,
      savingsSom: best ? savingsVsMedian(best.totalCostSom, median) : 0,
      signal: best ? buySignal(best.unitPriceSom, avg || best.unitPriceSom, 0) : "WAIT",
    };
  }

  async demand(productSlug?: string, region?: string) {
    return this.prisma.marketDemand.findMany({
      where: {
        ...(productSlug ? { product: { slug: productSlug } } : {}),
        ...(region ? { region } : {}),
      },
      include: { product: true },
      orderBy: { demandScore: "desc" },
    });
  }

  async opportunities(region: string, budgetSom: number, language: Language) {
    const demand = await this.prisma.marketDemand.findMany({
      where: { region },
      include: { product: true },
    });
    const rows = [];
    for (const d of demand) {
      const cmp = await this.compare(d.product.slug, region);
      const fallback = await this.compare(d.product.slug);
      const used = cmp.offers.length ? cmp : fallback;
      const best = used.best;
      if (!best) continue;
        const spread = d.product.category === "food" ? 1.18 : d.product.category === "agriculture" ? 1.12 : 1.15;
        const sellPrice = Math.round((used.market?.max ?? best.totalCostSom) * spread);
        const margin = ((sellPrice - best.totalCostSom) / Math.max(best.totalCostSom, 1)) * 100;
        const typicalLot: Record<string, number> = {
          cement: 1600,
          flour: 18000,
          "cotton-oil": 10000,
          rice: 8000,
          fertilizer: 40,
          rebar: 20,
          sugar: 12000,
          "dried-fruit": 4000,
        };
        const requiredCapital = best.totalCostSom * (typicalLot[d.product.slug] ?? 1000);
        rows.push({
          product: d.product.slug,
          label: productLabel(d.product.slug, language),
          demandScore: d.demandScore,
          demandChangePct: d.changePct,
          estimatedMarginPct: Number(margin.toFixed(1)),
          requiredCapitalSom: requiredCapital,
          budgetSom,
        source: d.source,
        collectedAt: d.collectedAt,
        confidence: d.confidence,
        bestSupplier: best,
      });
    }
    return rows;
  }

  describeOffer(language: Language, price: number) {
    return formatSom(price, language);
  }
}

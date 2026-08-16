import { Injectable, NotFoundException } from "@nestjs/common";
import { extractProfile } from "@businessos/shared";
import { PrismaService } from "../prisma/prisma.service";
import { FinanceService } from "../finance/finance.service";
import { MarketService } from "../market/market.service";

@Injectable()
export class BusinessesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finance: FinanceService,
    private readonly market: MarketService,
  ) {}

  async mine(userId: string) {
    const business = await this.prisma.business.findFirst({
      where: { ownerId: userId },
      include: { profile: true, healthScores: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!business) throw new NotFoundException("Business not found");
    return business;
  }

  async extractAndSave(userId: string, text: string) {
    const business = await this.mine(userId);
    const draft = extractProfile(text);
    const profile = await this.prisma.businessProfile.upsert({
      where: { businessId: business.id },
      create: {
        businessId: business.id,
        industry: draft.industry,
        region: draft.region,
        productsJson: JSON.stringify(draft.products ?? []),
        monthlyRevenueSom: draft.monthlyRevenueSom,
        employees: draft.employees,
        goals: draft.goal,
        onboardingText: text,
      },
      update: {
        industry: draft.industry ?? undefined,
        region: draft.region ?? undefined,
        productsJson: draft.products ? JSON.stringify(draft.products) : undefined,
        monthlyRevenueSom: draft.monthlyRevenueSom ?? undefined,
        employees: draft.employees ?? undefined,
        goals: draft.goal ?? undefined,
        onboardingText: text,
      },
    });
    if (draft.companyName) {
      await this.prisma.business.update({
        where: { id: business.id },
        data: { name: draft.companyName },
      });
    }
    await this.prisma.auditLog.create({
      data: { userId, action: "PROFILE_EXTRACT", meta: JSON.stringify(draft) },
    });
    return { draft, profile };
  }

  async updateProfile(
    userId: string,
    data: { name?: string; industry?: string; region?: string; monthlyRevenueSom?: number; goals?: string },
  ) {
    const business = await this.mine(userId);
    if (data.name) {
      await this.prisma.business.update({ where: { id: business.id }, data: { name: data.name } });
    }
    return this.prisma.businessProfile.update({
      where: { businessId: business.id },
      data: {
        industry: data.industry,
        region: data.region,
        monthlyRevenueSom: data.monthlyRevenueSom,
        goals: data.goals,
      },
    });
  }

  async briefing(userId: string) {
    const business = await this.mine(userId);
    const health = await this.finance.healthForBusiness(business.id);
    const credit = await this.finance.creditReadinessForBusiness(business.id);
    const region = business.profile?.region ?? "Qarshi";
    const demand = await this.market.demand(undefined, region);
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    return {
      health,
      credit,
      demand: demand.slice(0, 3),
      notifications,
    };
  }
}

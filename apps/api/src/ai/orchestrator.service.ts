import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  agentForIntent,
  approvalForIntent,
  extractEntities,
  extractProfile,
  formatCompactSom,
  productLabel,
  t,
  toolsForIntent,
  type ExtractedEntities,
  type Language,
} from "@businessos/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ToolsService, type ToolResult } from "./tools.service";

@Injectable()
export class OrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tools: ToolsService,
    private readonly config: ConfigService,
  ) {}

  async chat(userId: string, message: string, conversationId?: string) {
    const started = Date.now();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { businesses: { include: { profile: true } } },
    });
    if (!user) throw new Error("User not found");
    const business = user.businesses[0];
    const conversation = await this.ensureConversation(userId, business?.id, conversationId, message);

    await this.prisma.aiMessage.create({
      data: { conversationId: conversation.id, role: "user", content: message },
    });

    const history = await this.prisma.aiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 12,
    });
    const merged = history.map((m) => m.content).join("\n");
    const entities = extractEntities(message);
    const contextual = extractEntities(merged, entities.intent);
    if (!contextual.region && business?.profile?.region) contextual.region = business.profile.region;
    if (!contextual.product && business?.profile?.productsJson) {
      const products = JSON.parse(business.profile.productsJson) as string[];
      if (products[0] && contextual.intent !== "PROFITABILITY") contextual.product = products[0];
    }

    if (contextual.missing.length) {
      return this.persistAsk(user, business?.id, conversation.id, contextual, started);
    }

    const toolNames = toolsForIntent(contextual.intent);
    const toolResults = await this.tools.run(toolNames, contextual, business?.id);
    const composed = this.compose(contextual, toolResults, user.fullName);
    const polished = await this.maybePolish(composed.message, contextual, toolResults);

    const decision = await this.prisma.aiDecisionLog.create({
      data: {
        userId,
        businessId: business?.id,
        agentName: agentForIntent(contextual.intent),
        taskType: contextual.intent,
        inputReference: conversation.id,
        outputJson: JSON.stringify({ message: polished, cards: composed.cards }),
        confidence: composed.confidence,
        evidenceJson: JSON.stringify(composed.evidence),
        toolsJson: JSON.stringify(toolNames),
        latencyMs: Date.now() - started,
        humanApprovalRequired: approvalForIntent(contextual.intent) !== "NONE",
      },
    });

    await this.prisma.aiTask.create({
      data: {
        businessId: business?.id,
        conversationId: conversation.id,
        title: contextual.intent,
        status: "DONE",
      },
    });

    await this.prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: polished,
        cardsJson: JSON.stringify(composed.cards),
      },
    });

    if (contextual.intent === "PROFILE_UPDATE") {
      const draft = extractProfile(message);
      if (business) {
        await this.prisma.businessProfile.update({
          where: { businessId: business.id },
          data: {
            industry: draft.industry ?? undefined,
            region: draft.region ?? undefined,
            monthlyRevenueSom: draft.monthlyRevenueSom ?? undefined,
            goals: draft.goal ?? undefined,
            onboardingText: message,
          },
        });
      }
    }

    return {
      conversationId: conversation.id,
      message: polished,
      language: contextual.language,
      intent: contextual.intent,
      cards: composed.cards,
      decision: {
        id: decision.id,
        confidence: composed.confidence,
        evidence: composed.evidence,
        why: composed.why,
        approval: approvalForIntent(contextual.intent),
      },
    };
  }

  async feedback(userId: string, decisionId: string, helpful: boolean, comment?: string) {
    return this.prisma.aiDecisionLog.update({
      where: { id: decisionId },
      data: { helpful, feedback: comment },
    });
  }

  async conversations(userId: string) {
    return this.prisma.aiConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 30,
    });
  }

  async conversation(userId: string, id: string) {
    return this.prisma.aiConversation.findFirst({
      where: { id, userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  async tasks(userId: string) {
    const business = await this.prisma.business.findFirst({ where: { ownerId: userId } });
    return this.prisma.aiTask.findMany({
      where: { businessId: business?.id },
      orderBy: { createdAt: "desc" },
      take: 40,
    });
  }

  private async persistAsk(
    user: { id: string; language: string },
    businessId: string | undefined,
    conversationId: string,
    entities: ExtractedEntities,
    started: number,
  ) {
    const key =
      entities.missing[0] === "region"
        ? "missingRegion"
        : entities.missing[0] === "product"
          ? "missingProduct"
          : "missingCredit";
    const message = t(key, entities.language);
    await this.prisma.aiMessage.create({
      data: { conversationId, role: "assistant", content: message },
    });
    const decision = await this.prisma.aiDecisionLog.create({
      data: {
        userId: user.id,
        businessId,
        agentName: "AI_ORCHESTRATOR",
        taskType: "SLOT_FILL",
        inputReference: conversationId,
        outputJson: JSON.stringify({ missing: entities.missing }),
        confidence: 0.9,
        evidenceJson: "[]",
        toolsJson: "[]",
        latencyMs: Date.now() - started,
      },
    });
    return {
      conversationId,
      message,
      language: entities.language,
      intent: entities.intent,
      cards: [],
      decision: {
        id: decision.id,
        confidence: 0.9,
        evidence: [],
        why: [{ title: "Slot fill", detail: entities.missing.join(", ") }],
        approval: "NONE",
      },
    };
  }

  private compose(entities: ExtractedEntities, tools: ToolResult[], name: string) {
    const lang = entities.language;
    const evidence: Array<{ label: string; detail: string; source?: string; updatedAt?: string; confidence?: number }> = [];
    const why: Array<{ title: string; detail: string }> = [];
    const cards: unknown[] = [];
    let confidence = entities.confidence;
    let message = "";

    const rec = tools.find((t) => t.name === "recommend_products" && t.ok)?.data as
      | {
          items: Array<{
            product: string;
            label: string;
            demandScore: number;
            estimatedMarginPct: number;
            risk: string;
            recommended: boolean;
            why: string[];
            source?: string;
            collectedAt?: string;
            confidence?: number;
            bestSupplier?: { supplierName: string; matchScore: number; totalCostSom: number };
          }>;
          budgetSom: number;
          region: string;
        }
      | undefined;

    if (rec?.items?.length) {
      const top = rec.items.find((i) => i.recommended) ?? rec.items[0];
      cards.push({ type: "opportunities", items: rec.items.slice(0, 5) });
      const supplierTool = tools.find((t) => t.name === "search_suppliers" && t.ok)?.data as
        | { offers?: unknown[]; savingsSom?: number; best?: { supplierName: string; matchScore: number; totalCostSom: number } }
        | undefined;
      if (top.bestSupplier) {
        cards.push({
          type: "suppliers",
          items: rec.items
            .map((i) => i.bestSupplier)
            .filter(Boolean)
            .slice(0, 3),
        });
      }
      if (supplierTool?.offers) cards.push({ type: "compare", ...supplierTool });

      const supplierNote = top.bestSupplier
        ? lang === "en"
          ? ` Best supplier by total cost: ${top.bestSupplier.supplierName} (${formatCompactSom(top.bestSupplier.totalCostSom, "en")} / unit).`
          : lang === "ru"
            ? ` Лучший поставщик по полной стоимости: ${top.bestSupplier.supplierName} (${formatCompactSom(top.bestSupplier.totalCostSom, "ru")} / ед.).`
            : ` Umumiy xarajat bo‘yicha eng yaxshi supplier: ${top.bestSupplier.supplierName} (${formatCompactSom(top.bestSupplier.totalCostSom, lang)} / birlik).`
        : "";
      message =
        lang === "ru"
          ? `${name}, для бюджета ${formatCompactSom(rec.budgetSom, "ru")} в ${rec.region} я рекомендую ${top.label}. Спрос ${top.demandScore}/100, маржа ${top.estimatedMarginPct}%, риск ${top.risk}.${supplierNote}`
          : lang === "en"
            ? `${name}, for ${formatCompactSom(rec.budgetSom, "en")} in ${rec.region} I recommend ${top.label}. Demand ${top.demandScore}/100, margin ${top.estimatedMarginPct}%, risk ${top.risk}.${supplierNote}`
            : `${name}, ${rec.region}da ${formatCompactSom(rec.budgetSom, "uz")} byudjet uchun men ${top.label} ni tavsiya qilaman. Talab ${top.demandScore}/100, marja ${top.estimatedMarginPct}%, risk ${top.risk}.${supplierNote}`;
      why.push(...top.why.map((d) => ({ title: top.label, detail: d })));
      evidence.push({
        label: "Market adapter",
        detail: `${top.label} demand ${top.demandScore}`,
        source: top.source,
        updatedAt: top.collectedAt,
        confidence: top.confidence,
      });
      confidence = Math.min(0.92, (top.confidence ?? 0.78) + 0.08);
    }

    const compare = tools.find((t) => (t.name === "compare_prices" || t.name === "search_suppliers") && t.ok)
      ?.data as
      | {
          offers?: Array<{
            supplierName: string;
            totalCostSom: number;
            matchScore: number;
            unitPriceSom: number;
            quality: number;
            reliability: number;
            source: string;
            updatedAt: string;
          }>;
          best?: { supplierName: string; totalCostSom: number; matchScore: number };
          savingsSom?: number;
          signal?: string;
          market?: { avg: number; source: string; collectedAt: string; confidence: number };
          product?: string;
        }
      | undefined;

    if (!rec && compare?.offers?.length) {
      cards.push({ type: "compare", ...compare });
      const label = compare.product ? productLabel(compare.product, lang) : "mahsulot";
      const best = compare.best ?? compare.offers[0];
      message =
        lang === "en"
          ? `Best total-cost option for ${label}: ${best.supplierName} (${formatCompactSom(best.totalCostSom, "en")}). Signal: ${compare.signal}.`
          : lang === "ru"
            ? `Лучший вариант по полной стоимости для ${label}: ${best.supplierName} (${formatCompactSom(best.totalCostSom, "ru")}). Сигнал: ${compare.signal}.`
            : `${label} uchun umumiy xarajat bo‘yicha eng yaxshi variant: ${best.supplierName} — ${formatCompactSom(best.totalCostSom, "uz")}. AI signal: ${compare.signal}.` +
              (compare.savingsSom
                ? ` Medianaga nisbatan ${formatCompactSom(compare.savingsSom, lang)} tejash.`
                : "");
      why.push({
        title: "Total cost",
        detail: "Narx + yetkazib berish + soliq + tranzaksiya + kutilgan risk",
      });
      if (compare.market) {
        evidence.push({
          label: "Market price",
          detail: `avg ${compare.market.avg}`,
          source: compare.market.source,
          updatedAt: compare.market.collectedAt,
          confidence: compare.market.confidence,
        });
      }
      compare.offers.slice(0, 3).forEach((o) =>
        evidence.push({
          label: o.supplierName,
          detail: `total ${o.totalCostSom}, match ${o.matchScore}`,
          source: o.source,
          updatedAt: o.updatedAt,
        }),
      );
    }

    const health = tools.find((t) => t.name === "calculate_business_health" && t.ok)?.data as
      | { score: number; status: string; summary: string; breakdown: unknown }
      | undefined;
    if (health?.score) {
      cards.push({ type: "health", ...health });
      if (!message) message = health.summary;
    }

    const credit = tools.find((t) => t.name === "calculate_credit" && t.ok)?.data as
      | { monthlyPaymentSom: number; amountSom: number; months: number; annualRatePct: number }
      | undefined;
    const ready = tools.find((t) => t.name === "calculate_credit_readiness" && t.ok)?.data as
      | { score: number; improvements: string[]; breakdown: unknown }
      | undefined;
    if (credit) {
      cards.push({ type: "credit", ...credit, readiness: ready });
      message =
        lang === "en"
          ? `For ${formatCompactSom(credit.amountSom, "en")} over ${credit.months} months at ${credit.annualRatePct}%, monthly payment is ${formatCompactSom(credit.monthlyPaymentSom, "en")}. Credit readiness: ${ready?.score ?? "n/a"}/100.`
          : lang === "ru"
            ? `Кредит ${formatCompactSom(credit.amountSom, "ru")} на ${credit.months} мес. под ${credit.annualRatePct}%: платёж ${formatCompactSom(credit.monthlyPaymentSom, "ru")}. Готовность: ${ready?.score ?? "n/a"}/100.`
            : `${formatCompactSom(credit.amountSom, "uz")} / ${credit.months} oy / ${credit.annualRatePct}%: oylik to‘lov ${formatCompactSom(credit.monthlyPaymentSom, "uz")}. Kreditga tayyorlik: ${ready?.score ?? "n/a"}/100.` +
              (ready?.improvements?.length
                ? ` Kredit olishdan oldin yaxshilang: ${ready.improvements.join(", ")}.`
                : "");
    }

    const plan = tools.find((t) => t.name === "generate_business_plan" && t.ok)?.data;
    if (plan) cards.push({ type: "plan", ...(plan as object) });

    const demand = tools.find((t) => t.name === "analyze_demand" && t.ok)?.data as
      | Array<{ demandScore: number; changePct: number; product: { slug: string }; source: string; collectedAt: Date; confidence: number }>
      | undefined;
    if (demand?.length && !rec) {
      cards.push({
        type: "demand",
        items: demand.slice(0, 6).map((d) => ({
          product: d.product.slug,
          label: productLabel(d.product.slug, lang),
          score: d.demandScore,
          changePct: d.changePct,
        })),
      });
      if (!message) {
        const d0 = demand[0];
        message =
          lang === "en"
            ? `Demand for ${productLabel(d0.product.slug, "en")} is ${d0.demandScore}/100 (${d0.changePct}%).`
            : lang === "ru"
              ? `Спрос на ${productLabel(d0.product.slug, "ru")}: ${d0.demandScore}/100 (${d0.changePct}%).`
              : `${productLabel(d0.product.slug, "uz")} talabi ${d0.demandScore}/100 (${d0.changePct > 0 ? "+" : ""}${d0.changePct}%).`;
        evidence.push({
          label: "Demand",
          detail: `${d0.product.slug} ${d0.demandScore}`,
          source: d0.source,
          updatedAt: d0.collectedAt?.toString(),
          confidence: d0.confidence,
        });
      }
    }

    if (!message) {
      message =
        lang === "en"
          ? "I understood the request. Add a product, region, or budget so I can run the tools."
          : lang === "ru"
            ? "Запрос понят. Укажите товар, регион или бюджет — запущу инструменты."
            : "So‘rovni tushundim. Mahsulot, hudud yoki byudjetni yozing — tool’larni ishga tushiraman.";
    }

    return { message, cards, evidence, why, confidence };
  }

  private async maybePolish(message: string, entities: ExtractedEntities, tools: ToolResult[]) {
    const key = this.config.get<string>("OPENAI_API_KEY");
    if (!key) return message;
    try {
      const base = this.config.get("OPENAI_BASE_URL") ?? "https://api.openai.com/v1";
      const model = this.config.get("OPENAI_MODEL") ?? "gpt-4o-mini";
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You rewrite BusinessOS answers. Never invent numbers. Use only provided tool JSON. Keep the user language. No legal accusations.",
            },
            {
              role: "user",
              content: JSON.stringify({ draft: message, language: entities.language, tools }),
            },
          ],
        }),
      });
      if (!res.ok) return message;
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return json.choices?.[0]?.message?.content?.trim() || message;
    } catch {
      return message;
    }
  }

  private async ensureConversation(
    userId: string,
    businessId: string | undefined,
    conversationId: string | undefined,
    message: string,
  ) {
    if (conversationId) {
      const existing = await this.prisma.aiConversation.findFirst({
        where: { id: conversationId, userId },
      });
      if (existing) return existing;
    }
    return this.prisma.aiConversation.create({
      data: {
        userId,
        businessId,
        title: message.slice(0, 72),
      },
    });
  }
}

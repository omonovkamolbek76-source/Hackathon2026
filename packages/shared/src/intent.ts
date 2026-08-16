import type { Intent } from "./types";

const RULES: Array<{ intent: Intent; patterns: RegExp[] }> = [
  {
    intent: "CREDIT",
    patterns: [/kredit/i, /кредит/i, /credit/i, /ssuda/i, /moliyalashtir/i],
  },
  {
    intent: "BUSINESS_PLAN",
    patterns: [/biznes[-\s]?reja/i, /бизнес[-\s]?план/i, /business plan/i],
  },
  {
    intent: "PROFITABILITY",
    patterns: [
      /foydali/i,
      /qaysi mahsulot/i,
      /olib kelib sot/i,
      /марж/i, /прибыл/i,
      /profit/i,
      /which product/i,
    ],
  },
  {
    intent: "SUPPLIER_SEARCH",
    patterns: [/yetkazib/i, /supplier/i, /поставщик/i, /ta'minot/i, /taminot/i],
  },
  {
    intent: "PRICE_COMPARE",
    patterns: [/solishtir/i, /compare/i, /сравн/i, /eng arzon/i, /cheapest/i],
  },
  {
    intent: "DEMAND_ANALYSIS",
    patterns: [/talab/i, /demand/i, /спрос/i],
  },
  {
    intent: "MARKET_SEARCH",
    patterns: [/narx/i, /цена/i, /price/i, /bozor/i, /рынок/i, /market/i],
  },
  {
    intent: "BUSINESS_HEALTH",
    patterns: [/sog‘lig/i, /soglig/i, /health/i, /зарар/i, /daromad kamay/i, /nima uchun/i],
  },
  {
    intent: "NEGOTIATION",
    patterns: [/muzokara/i, /переговор/i, /negotiat/i, /taklif qildi/i],
  },
  {
    intent: "TRUST_REVIEW",
    patterns: [/sharh/i, /отзыв/i, /review/i, /soxta/i],
  },
  {
    intent: "BRIEFING",
    patterns: [/briefing/i, /bugun nima/i, /сегодня/i, /today/i],
  },
  {
    intent: "PROFILE_UPDATE",
    patterns: [/mening biznes/i, /ishlab chiqaraman/i, /компания/i, /men .*man/i],
  },
];

export function detectIntent(text: string): { intent: Intent; confidence: number } {
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) {
      return { intent: rule.intent, confidence: 0.86 };
    }
  }
  return { intent: "GENERAL", confidence: 0.45 };
}

export function agentForIntent(intent: Intent): string {
  switch (intent) {
    case "CREDIT":
    case "BUSINESS_PLAN":
    case "PROFITABILITY":
    case "NEGOTIATION":
      return "FINANCE_AGENT";
    case "BUSINESS_HEALTH":
    case "BRIEFING":
      return "BUSINESS_AGENT";
    case "TRUST_REVIEW":
      return "TRUST_AGENT";
    case "PROFILE_UPDATE":
      return "UNIVERSAL_COPILOT";
    default:
      return "MARKET_AGENT";
  }
}

export function toolsForIntent(intent: Intent): string[] {
  switch (intent) {
    case "MARKET_SEARCH":
      return ["search_market_data", "compare_prices", "analyze_demand"];
    case "SUPPLIER_SEARCH":
      return ["search_suppliers", "compare_prices", "calculate_logistics"];
    case "PRICE_COMPARE":
      return ["compare_prices", "search_suppliers"];
    case "DEMAND_ANALYSIS":
      return ["analyze_demand", "search_market_data"];
    case "PROFITABILITY":
      return ["recommend_products", "analyze_demand", "calculate_profit", "search_suppliers"];
    case "CREDIT":
      return ["calculate_credit", "calculate_credit_readiness", "calculate_profit"];
    case "BUSINESS_PLAN":
      return ["generate_business_plan", "calculate_profit", "analyze_demand"];
    case "BUSINESS_HEALTH":
      return ["calculate_business_health", "analyze_demand"];
    case "NEGOTIATION":
      return ["compare_prices", "search_market_data"];
    case "TRUST_REVIEW":
      return ["analyze_reviews"];
    case "BRIEFING":
      return ["calculate_business_health", "analyze_demand", "search_market_data"];
    default:
      return ["search_market_data"];
  }
}

export function approvalForIntent(intent: Intent): "NONE" | "USER_CONFIRM" | "HUMAN_REQUIRED" {
  if (intent === "CREDIT") return "USER_CONFIRM";
  if (intent === "TRUST_REVIEW") return "NONE";
  return "NONE";
}

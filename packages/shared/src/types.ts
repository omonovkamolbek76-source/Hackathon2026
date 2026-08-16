export type Role =
  | "ENTREPRENEUR"
  | "CHAMBER_OPERATOR"
  | "ANALYST"
  | "ADMIN"
  | "GOVERNMENT_ANALYST";

export type Language = "uz" | "ru" | "en";

export type Intent =
  | "MARKET_SEARCH"
  | "SUPPLIER_SEARCH"
  | "PRICE_COMPARE"
  | "DEMAND_ANALYSIS"
  | "PROFITABILITY"
  | "CREDIT"
  | "BUSINESS_PLAN"
  | "BUSINESS_HEALTH"
  | "NEGOTIATION"
  | "TRUST_REVIEW"
  | "PROFILE_UPDATE"
  | "BRIEFING"
  | "GENERAL";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type ApprovalGate = "NONE" | "USER_CONFIRM" | "HUMAN_REQUIRED";
export type BuySignal = "BUY" | "WAIT" | "NEGOTIATE";
export type DemandTone = "RISING" | "STABLE" | "CAUTION" | "FALLING";

export interface ExtractedEntities {
  language: Language;
  intent: Intent;
  product?: string;
  region?: string;
  budgetSom?: number;
  quantity?: number;
  creditAmountSom?: number;
  termMonths?: number;
  rawText: string;
  missing: string[];
  confidence: number;
}

export interface BusinessProfileDraft {
  companyName?: string;
  industry?: string;
  region?: string;
  products?: string[];
  monthlyRevenueSom?: number;
  employees?: number;
  goal?: string;
}

export interface EvidenceItem {
  label: string;
  detail: string;
  source?: string;
  updatedAt?: string;
  confidence?: number;
}

export interface SupplierOffer {
  supplierId: string;
  supplierName: string;
  product: string;
  region: string;
  unitPriceSom: number;
  deliverySom: number;
  taxesSom: number;
  transactionSom: number;
  expectedRiskSom: number;
  totalCostSom: number;
  quality: number;
  reliability: number;
  matchScore: number;
  source: string;
  updatedAt: string;
}

export interface ProductOpportunity {
  product: string;
  demandScore: number;
  demandTone: DemandTone;
  estimatedMarginPct: number;
  risk: RiskLevel;
  capitalFit: boolean;
  recommended: boolean;
  why: string[];
}

export interface FinanceModel {
  capexSom: number;
  opexMonthlySom: number;
  revenueMonthlySom: number;
  grossProfitMonthlySom: number;
  netProfitMonthlySom: number;
  breakEvenUnits: number;
  roiAnnualPct: number;
  paybackMonths: number;
  cashFlow: number[];
}

export interface ScoreBreakdown {
  label: string;
  score: number;
}

export interface HealthResult {
  score: number;
  status: "HEALTHY" | "WATCH" | "CRITICAL";
  breakdown: ScoreBreakdown[];
  summary: string;
}

export interface CreditReadiness {
  score: number;
  breakdown: ScoreBreakdown[];
  improvements: string[];
}

export interface WhyItem {
  title: string;
  detail: string;
}

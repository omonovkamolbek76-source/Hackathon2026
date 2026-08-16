import { detectIntent } from "./intent";
import { detectLanguage } from "./language";
import { parseSomAmount } from "./money";
import { detectProduct } from "./products";
import { detectRegion } from "./regions";
import type { BusinessProfileDraft, ExtractedEntities, Intent } from "./types";

export function extractEntities(text: string, fallbackIntent?: Intent): ExtractedEntities {
  const language = detectLanguage(text);
  const { intent, confidence } = detectIntent(text);
  const product = detectProduct(text);
  const region = detectRegion(text);
  const budget = parseSomAmount(text);
  const qty = text.match(/(\d[\d\s]{0,6})\s*(dona|шт|units?|kg|ton)/i);
  const term = text.match(/(\d{1,2})\s*(oy|мес|month)/i);

  const resolvedIntent = intent === "GENERAL" && fallbackIntent ? fallbackIntent : intent;
  const missing: string[] = [];

  if (
    ["MARKET_SEARCH", "SUPPLIER_SEARCH", "PRICE_COMPARE", "DEMAND_ANALYSIS"].includes(resolvedIntent) &&
    !product
  ) {
    missing.push("product");
  }
  if (resolvedIntent === "PROFITABILITY" && !region) missing.push("region");
  if (resolvedIntent === "CREDIT" && !budget) missing.push("creditAmount");

  return {
    language,
    intent: resolvedIntent,
    product: product?.slug,
    region,
    budgetSom: resolvedIntent === "CREDIT" ? undefined : budget,
    quantity: qty ? Number(qty[1].replace(/\s/g, "")) : undefined,
    creditAmountSom: resolvedIntent === "CREDIT" ? budget : undefined,
    termMonths: term ? Number(term[1]) : undefined,
    rawText: text,
    missing,
    confidence,
  };
}

export function extractProfile(text: string): BusinessProfileDraft {
  const region = detectRegion(text);
  const product = detectProduct(text);
  const revenue = parseSomAmount(text);
  const employees = text.match(/(\d{1,4})\s*(ishchi|xodim|сотрудник|employee)/i);

  let industry: string | undefined;
  if (/mebel|мебел|furniture/i.test(text)) industry = "Furniture Manufacturing";
  else if (/restoran|кафе|oshxona|restaurant/i.test(text)) industry = "Food Service";
  else if (/qurilish|строител|construction/i.test(text)) industry = "Construction";
  else if (/savdo|торгов|trade|optom/i.test(text)) industry = "Wholesale Trade";
  else if (/ishlab chiqar|производ|manufactur/i.test(text)) industry = "Manufacturing";
  else if (product) industry = product.category;

  let goal: string | undefined;
  if (/stanok|оборудование|equipment/i.test(text)) goal = "Equipment financing";
  else if (/kredit|кредит|credit/i.test(text)) goal = "Financing";
  else if (/kengay|expand/i.test(text)) goal = "Expansion";

  const company = text.match(/(?:kompaniya|firma|company|компания)\s+([A-Za-z0-9‘'ʼ\- ]{2,40})/i);

  return {
    companyName: company?.[1]?.trim(),
    industry,
    region,
    products: product ? [product.slug] : undefined,
    monthlyRevenueSom: revenue,
    employees: employees ? Number(employees[1]) : undefined,
    goal,
  };
}

/** Local finance helpers — demo formulas, not bank quotes. */

export function monthlyPayment(principal: number, annualRatePct: number, months: number): number {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export function creditLoadCheck(monthlyProfit: number, monthlyPaymentSom: number) {
  const ratio = monthlyProfit > 0 ? monthlyPaymentSom / monthlyProfit : 1;
  const healthy = ratio <= 0.35;
  return {
    ratio,
    healthy,
    message: healthy
      ? `Qarz yuki taxminan ${(ratio * 100).toFixed(0)}% — namuna chegaraga (35%) nisbatan qabul qilinadigan.`
      : `Qarz yuki ${(ratio * 100).toFixed(0)}% — foydaga nisbatan og‘ir ko‘rinadi. Summa yoki muddatni qayta ko‘rib chiqing.`,
  };
}

export function estimateTurnoverTax(monthlyRevenue: number) {
  // Simplified demo: illustrative 4% turnover-style estimate — not legal advice
  const rate = monthlyRevenue <= 100_000_000 ? 0.04 : 0.04;
  const tax = Math.round(monthlyRevenue * rate);
  return {
    ratePct: rate * 100,
    taxSom: tax,
    note: "Namuna hisob. Aniq rejim va stavka uchun soliq.uz / buxgalter.",
  };
}

export function breakEvenMonths(capex: number, monthlyNet: number) {
  if (monthlyNet <= 0) return { months: null as number | null, message: "Hozircha oylik sof foyda musbat emas — avval xarajat/narxni qayta ko‘ring." };
  const months = Math.ceil(capex / monthlyNet);
  return { months, message: `Taxminiy breakeven: ~${months} oy (namuna model).` };
}

export function parseMillions(text: string): number | undefined {
  const m = text.replace(/\s/g, "").match(/(\d+(?:[.,]\d+)?)\s*mln/i);
  if (m) return Math.round(Number(m[1].replace(",", ".")) * 1_000_000);
  const n = text.replace(/\s/g, "").match(/(\d{5,})/);
  if (n) return Number(n[1]);
  return undefined;
}

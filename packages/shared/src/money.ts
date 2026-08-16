const MLN = 1_000_000;
const MING = 1_000;

export function parseSomAmount(text: string): number | undefined {
  const normalized = text
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/млн/g, "mln")
    .replace(/миллион/g, "mln")
    .replace(/million/g, "mln")
    .replace(/ming/g, "k")
    .replace(/тыс/g, "k")
    .replace(/мин /g, "k ");

  const mln = normalized.match(/(\d+(?:[.,]\d+)?)\s*(mln|m)\b/);
  if (mln) return Math.round(Number(mln[1].replace(",", ".")) * MLN);

  const k = normalized.match(/(\d+(?:[.,]\d+)?)\s*(k|ming)\b/);
  if (k) return Math.round(Number(k[1].replace(",", ".")) * MING);

  const raw = normalized.match(/(\d[\d\s]{4,})\s*(som|so['’]?m|сум|uzs)?/);
  if (raw) return Number(raw[1].replace(/\s/g, ""));

  return undefined;
}

export function formatSom(value: number, language: "uz" | "ru" | "en" = "uz"): string {
  const formatted = new Intl.NumberFormat("uz-UZ").format(Math.round(value));
  if (language === "ru") return `${formatted} сум`;
  if (language === "en") return `${formatted} UZS`;
  return `${formatted} so‘m`;
}

export function formatCompactSom(value: number, language: "uz" | "ru" | "en" = "uz"): string {
  if (value >= MLN) {
    const n = (value / MLN).toFixed(value % MLN === 0 ? 0 : 1);
    if (language === "ru") return `${n} млн сум`;
    if (language === "en") return `${n}m UZS`;
    return `${n} mln so‘m`;
  }
  return formatSom(value, language);
}

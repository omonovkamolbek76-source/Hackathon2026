/**
 * Pulls owner name / idea / capital out of free-text chat so the coach
 * can talk about the business instead of restarting the 0/9 intro survey.
 */

const APOSTROPHE = `['\u2018\u2019\u02bb\u02bc\`]`;

const NAME_STOPWORDS = new Set(
  [
    'bor',
    'yoq',
    'nima',
    'kerak',
    'biznes',
    'goya',
    'savdo',
    'dostim',
    'men',
    'menda',
    'menga',
    'biznesim',
    'tadbirkor',
    'maslahat',
    'iqtisodiy',
    'huquqiy',
    'zavod',
    'savod',
  ].map((s) => s.toLowerCase()),
);

function titleCaseName(raw: string): string {
  const cleaned = raw.replace(/^[^A-Za-zÀ-žGʻgʻOʻoʻ]+|[^A-Za-zÀ-žGʻgʻOʻoʻ]+$/g, '');
  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function extractOwnerName(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  const patterns = [
    new RegExp(
      `(?:mening|menim|meni|mani|menning)?\\s*ism(?:im|ingiz)\\s*(?:[:\\-]|deb|esa)?\\s+([A-Za-zÀ-žGʻgʻOʻoʻ${APOSTROPHE}]{2,30})`,
      'i',
    ),
    /(?:ismim)\s+([A-Za-zÀ-ž]{2,30})/i,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (!m?.[1]) continue;
    const name = titleCaseName(m[1]);
    if (name.length < 2 || NAME_STOPWORDS.has(name.toLowerCase())) continue;
    if (/^\d+$/.test(name)) continue;
    return name;
  }
  return null;
}

export function isNameIntroduction(text: string): boolean {
  if (!extractOwnerName(text)) return false;
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length > 10) return false;
  return !hasStatedBusinessIdea(text) && !wantsConsultingAdvice(text);
}

export function hasStatedBusinessIdea(text: string): boolean {
  const t = text.toLowerCase();
  if (/(g['\u2018\u2019]?oya(m)?|goya(m)?)\s+bor/.test(t) && wordCount(text) >= 6) return true;
  if (/zavod|savod|fabrika|sex|ishlab\s+chiqar/.test(t) && /qurmoq|ochmoq|boshlamoq|qilmoq/.test(t)) {
    return true;
  }
  if (isBrickTalk(t) && /qurmoq|zavod|savod|ishlab/.test(t)) return true;
  if (/mahsulot(im)?|xizmat(im)?|do['\u2018\u2019]?kon|kafe|restoran|ferma/.test(t) && /ochmoq|qurmoq|boshlamoq/.test(t)) {
    return true;
  }
  return false;
}

export function wantsConsultingAdvice(text: string): boolean {
  return /iqtisodiy|huquqiy|yuridik|maslahat|tahlil|statistika|bozor|narx|soliq|yatt|mchj|mablag|sarmoya|milliard|million|kredit|moliyalashtir/i.test(
    text,
  );
}

export function isBrickTalk(text: string): boolean {
  return /gisht|g['\u2018\u2019]?ish(t)?|qurilish\s+material|tsement|blok/i.test(text);
}

export function isBrickFactoryTalk(text: string): boolean {
  const t = text.toLowerCase();
  return isBrickTalk(t) && /zavod|savod|qurmoq|ishlab\s+chiqar|fabrika/i.test(t);
}

export function wantsDetailedAdvice(text: string): boolean {
  if (hasStatedBusinessIdea(text) || wantsConsultingAdvice(text) || isBrickFactoryTalk(text)) return true;
  return /olmoq|sotib|gisht|g['\u2018\u2019]?ish(t)?|statistika|tahlil|bozor|narx|qancha|optom|qurilish|material|yetkazib|supplier|tovar|zavod|savod|qurmoq|sarmoya/i.test(
    text,
  );
}

export function extractCapitalNote(text: string): string | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(milliard|mlrd|billion|million|mln|ming)\b/i);
  if (!m) return null;
  return `${m[1]} ${m[2].toLowerCase()} (foydalanuvchi aytdi — tasdiqlanmagan)`;
}

export function extractIdeaSummary(text: string): string | null {
  if (isBrickFactoryTalk(text)) return "G'isht zavodi qurish";
  if (isBrickTalk(text) && /olmoq|sotib|bozor/.test(text.toLowerCase())) return "G'isht / qurilish materiali savdosi";
  if (hasStatedBusinessIdea(text)) {
    const clipped = text.trim().replace(/\s+/g, ' ');
    return clipped.length > 180 ? `${clipped.slice(0, 177)}…` : clipped;
  }
  return null;
}

export function extractIndustry(text: string): string | null {
  if (isBrickTalk(text) || /qurilish/.test(text.toLowerCase())) return 'Ishlab chiqarish / qurilish';
  if (/savdo|do['\u2018\u2019]?kon/.test(text.toLowerCase())) return 'Savdo';
  if (/xizmat/.test(text.toLowerCase())) return 'Xizmat';
  return null;
}

export function extractProduct(text: string): string | null {
  if (isBrickTalk(text)) return "G'isht";
  return null;
}

export type CoachFacts = {
  ownerName: string | null;
  idea: string | null;
  product: string | null;
  industry: string | null;
  capitalNote: string | null;
};

export function extractCoachFacts(text: string): CoachFacts {
  return {
    ownerName: extractOwnerName(text),
    idea: extractIdeaSummary(text),
    product: extractProduct(text),
    industry: extractIndustry(text),
    capitalNote: extractCapitalNote(text),
  };
}

export function isOnboardingTrap(reply: string): boolean {
  return /0\s*\/\s*9-bosqich\s*:\s*Tanishuv|eng katta muammo nima/i.test(reply);
}

export function asksForName(reply: string): boolean {
  return /ismingiz\s+nima|ismingizni\s+(ayting|yozing|ayt)|nima\s+ismingiz|ismingiz\s+kim|ismingizni\s+bil/i.test(
    reply,
  );
}

export function inferCoachStage(message: string, current: number, hasStoredIdea = false): number {
  if (wantsConsultingAdvice(message) && /huquqiy|yuridik|yatt|mchj|soliq|iqtisodiy/i.test(message)) {
    return Math.max(current, 4);
  }
  if (isBrickFactoryTalk(message) || hasStatedBusinessIdea(message) || hasStoredIdea) {
    return Math.max(current, 1);
  }
  if (current === 0 && wantsDetailedAdvice(message)) return 1;
  return current;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

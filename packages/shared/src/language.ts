import type { Language } from "./types";

export function detectLanguage(text: string): Language {
  if (/[а-яё]/i.test(text)) return "ru";
  if (
    /[o‘g‘q]|\b(menga|kerak|mahsulot|narx|kredit|biznes|tadbirkor|so‘m|som|qarshi|toshkent)\b/i.test(
      text,
    )
  ) {
    return "uz";
  }
  if (/\b(the|and|need|credit|price|supplier|please|business)\b/i.test(text)) return "en";
  return "uz";
}

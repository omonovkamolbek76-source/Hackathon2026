import { COPY, type Language } from "@businessos/shared";

export const LANGS: Language[] = ["uz", "ru", "en"];

export function readLang(): Language {
  if (typeof window === "undefined") return "uz";
  const stored = localStorage.getItem("bos_lang") as Language | null;
  return stored && LANGS.includes(stored) ? stored : "uz";
}

export function writeLang(lang: Language) {
  localStorage.setItem("bos_lang", lang);
}

export function tx(key: keyof typeof COPY, lang: Language) {
  return COPY[key][lang];
}

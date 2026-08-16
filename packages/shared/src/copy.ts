import type { Language } from "./types";

type Dict = Record<string, Record<Language, string>>;

export const COPY: Dict = {
  tagline: {
    uz: "Bitta platforma. Bitta AI. Butun biznesingiz.",
    ru: "Одна платформа. Один ИИ. Весь ваш бизнес.",
    en: "One platform. One AI. Your entire business.",
  },
  ask: {
    uz: "Biznesingizda nima qilmoqchisiz?",
    ru: "Что хотите сделать в бизнесе?",
    en: "What do you want to do in your business?",
  },
  greeting: {
    uz: "Xayrli kun",
    ru: "Добрый день",
    en: "Good day",
  },
  why: {
    uz: "Nega?",
    ru: "Почему?",
    en: "Why?",
  },
  health: {
    uz: "Biznes sog‘lig‘i",
    ru: "Здоровье бизнеса",
    en: "Business health",
  },
  signals: {
    uz: "AI signallar",
    ru: "Сигналы ИИ",
    en: "AI signals",
  },
  login: {
    uz: "Kirish",
    ru: "Войти",
    en: "Sign in",
  },
  register: {
    uz: "Ro‘yxatdan o‘tish",
    ru: "Регистрация",
    en: "Create account",
  },
  missingRegion: {
    uz: "Qaysi hududda sotmoqchisiz yoki xarid qilmoqchisiz?",
    ru: "В каком регионе планируете продажу или закупку?",
    en: "Which region are you buying or selling in?",
  },
  missingProduct: {
    uz: "Qaysi mahsulot kerak? Masalan: sement, un, guruch.",
    ru: "Какой товар нужен? Например: цемент, мука, рис.",
    en: "Which product do you need? For example: cement, flour, rice.",
  },
  missingCredit: {
    uz: "Qancha kredit kerak va necha oyga?",
    ru: "Какая сумма кредита и на сколько месяцев?",
    en: "How much credit do you need and for how many months?",
  },
  aiDown: {
    uz: "AI vaqtincha ishlamayapti. Profilingiz va saqlangan ma’lumotlar ochiq.",
    ru: "ИИ временно недоступен. Профиль и сохранённые данные доступны.",
    en: "AI is temporarily unavailable. Profile and saved data still work.",
  },
  riskSignalOnly: {
    uz: "Risk signal mavjud. Yakuniy qaror inson vakolatida.",
    ru: "Есть сигнал риска. Итоговое решение принимает человек.",
    en: "A risk signal exists. Final decision stays with a human.",
  },
};

export function t(key: keyof typeof COPY, language: Language): string {
  return COPY[key][language];
}

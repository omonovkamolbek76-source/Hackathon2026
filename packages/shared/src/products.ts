export interface CatalogProduct {
  slug: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  unit: string;
  aliases: string[];
  category: string;
}

export const CATALOG: CatalogProduct[] = [
  {
    slug: "cement",
    nameUz: "Sement",
    nameRu: "Цемент",
    nameEn: "Cement",
    unit: "50kg",
    aliases: ["sement", "цемент", "cement"],
    category: "construction",
  },
  {
    slug: "flour",
    nameUz: "Un",
    nameRu: "Мука",
    nameEn: "Flour",
    unit: "kg",
    aliases: ["un", "muka", "мука", "flour"],
    category: "food",
  },
  {
    slug: "cotton-oil",
    nameUz: "Paxta yog‘i",
    nameRu: "Хлопковое масло",
    nameEn: "Cotton oil",
    unit: "l",
    aliases: ["paxta yog", "yog‘", "масло", "cotton oil", "paxta yogi"],
    category: "food",
  },
  {
    slug: "rice",
    nameUz: "Guruch",
    nameRu: "Рис",
    nameEn: "Rice",
    unit: "kg",
    aliases: ["guruch", "рис", "rice"],
    category: "food",
  },
  {
    slug: "fertilizer",
    nameUz: "Mineral o‘g‘it",
    nameRu: "Минеральное удобрение",
    nameEn: "Mineral fertilizer",
    unit: "ton",
    aliases: ["ogit", "o‘g‘it", "удобрен", "fertilizer", "karbamid"],
    category: "agriculture",
  },
  {
    slug: "rebar",
    nameUz: "Armatura",
    nameRu: "Арматура",
    nameEn: "Rebar",
    unit: "ton",
    aliases: ["armatura", "арматура", "rebar", "temir"],
    category: "construction",
  },
  {
    slug: "sugar",
    nameUz: "Qand",
    nameRu: "Сахар",
    nameEn: "Sugar",
    unit: "kg",
    aliases: ["qand", "shakar", "сахар", "sugar"],
    category: "food",
  },
  {
    slug: "dried-fruit",
    nameUz: "Quruq meva",
    nameRu: "Сухофрукты",
    nameEn: "Dried fruit",
    unit: "kg",
    aliases: ["quruq meva", "сухофрукт", "dried fruit", "o‘rik", "mayiz"],
    category: "food",
  },
];

export function detectProduct(text: string): CatalogProduct | undefined {
  const lower = text.toLowerCase();
  return CATALOG.find((p) => p.aliases.some((a) => lower.includes(a)));
}

export function productLabel(slug: string, language: "uz" | "ru" | "en"): string {
  const p = CATALOG.find((x) => x.slug === slug);
  if (!p) return slug;
  if (language === "ru") return p.nameRu;
  if (language === "en") return p.nameEn;
  return p.nameUz;
}

export interface ProviderRecord<T> {
  source: string;
  collectedAt: Date;
  confidence: number;
  data: T;
}

export interface MarketDataProvider {
  name: string;
  fetch(): Promise<
    ProviderRecord<{
      products: Array<{
        slug: string;
        nameUz: string;
        nameRu: string;
        nameEn: string;
        unit: string;
        category: string;
      }>;
      prices: Array<{
        slug: string;
        region: string;
        avg: number;
        min: number;
        max: number;
      }>;
      demand: Array<{
        slug: string;
        region: string;
        score: number;
        changePct: number;
        seasonal: string;
      }>;
      suppliers: Array<{
        name: string;
        region: string;
        reliability: number;
        quality: number;
        offers: Array<{
          slug: string;
          unitPrice: number;
          delivery: number;
          taxes: number;
          transaction: number;
          expectedRisk: number;
          capacityMonthly: number;
        }>;
      }>;
    }>
  >;
}

/** Seed adapter — labeled dataset, never presented as a live exchange feed. */
export class SeedMarketProvider implements MarketDataProvider {
  name = "BusinessOS Seed Market Adapter";

  async fetch() {
    const collectedAt = new Date("2026-08-16T06:00:00.000Z");
    return {
      source: this.name,
      collectedAt,
      confidence: 0.78,
      data: {
        products: [
          { slug: "cement", nameUz: "Sement", nameRu: "Цемент", nameEn: "Cement", unit: "50kg", category: "construction" },
          { slug: "flour", nameUz: "Un", nameRu: "Мука", nameEn: "Flour", unit: "kg", category: "food" },
          { slug: "cotton-oil", nameUz: "Paxta yog‘i", nameRu: "Хлопковое масло", nameEn: "Cotton oil", unit: "l", category: "food" },
          { slug: "rice", nameUz: "Guruch", nameRu: "Рис", nameEn: "Rice", unit: "kg", category: "food" },
          { slug: "fertilizer", nameUz: "Mineral o‘g‘it", nameRu: "Минеральное удобрение", nameEn: "Mineral fertilizer", unit: "ton", category: "agriculture" },
          { slug: "rebar", nameUz: "Armatura", nameRu: "Арматура", nameEn: "Rebar", unit: "ton", category: "construction" },
          { slug: "sugar", nameUz: "Qand", nameRu: "Сахар", nameEn: "Sugar", unit: "kg", category: "food" },
          { slug: "dried-fruit", nameUz: "Quruq meva", nameRu: "Сухофрукты", nameEn: "Dried fruit", unit: "kg", category: "food" },
        ],
        prices: [
          { slug: "cement", region: "Qarshi", avg: 112000, min: 98000, max: 128000 },
          { slug: "cement", region: "Toshkent", avg: 118000, min: 105000, max: 135000 },
          { slug: "flour", region: "Qarshi", avg: 9500, min: 8200, max: 11000 },
          { slug: "flour", region: "Toshkent", avg: 10200, min: 9000, max: 12000 },
          { slug: "cotton-oil", region: "Qarshi", avg: 21000, min: 18500, max: 24500 },
          { slug: "rice", region: "Qarshi", avg: 17500, min: 15000, max: 21000 },
          { slug: "fertilizer", region: "Qarshi", avg: 4800000, min: 4300000, max: 5400000 },
          { slug: "rebar", region: "Toshkent", avg: 10200000, min: 9400000, max: 11100000 },
          { slug: "sugar", region: "Toshkent", avg: 13800, min: 12000, max: 16000 },
          { slug: "dried-fruit", region: "Samarqand", avg: 42000, min: 35000, max: 52000 },
        ],
        demand: [
          { slug: "cement", region: "Qarshi", score: 91, changePct: 12, seasonal: "construction-peak" },
          { slug: "flour", region: "Qarshi", score: 87, changePct: 9, seasonal: "stable-staple" },
          { slug: "cotton-oil", region: "Qarshi", score: 74, changePct: 3, seasonal: "harvest" },
          { slug: "rice", region: "Qarshi", score: 80, changePct: 6, seasonal: "wedding-season" },
          { slug: "fertilizer", region: "Qarshi", score: 88, changePct: 11, seasonal: "planting" },
          { slug: "rebar", region: "Toshkent", score: 84, changePct: 7, seasonal: "construction-peak" },
          { slug: "sugar", region: "Toshkent", score: 70, changePct: -2, seasonal: "stable-staple" },
          { slug: "dried-fruit", region: "Samarqand", score: 83, changePct: 8, seasonal: "export" },
        ],
        suppliers: [
          {
            name: "Qarshi Qurilish Ta'minot",
            region: "Qarshi",
            reliability: 91,
            quality: 88,
            offers: [
              { slug: "cement", unitPrice: 104000, delivery: 6000, taxes: 4000, transaction: 1500, expectedRisk: 2500, capacityMonthly: 80000 },
              { slug: "rebar", unitPrice: 9800000, delivery: 220000, taxes: 180000, transaction: 40000, expectedRisk: 120000, capacityMonthly: 400 },
            ],
          },
          {
            name: "Nasaf Beton Servis",
            region: "Qarshi",
            reliability: 84,
            quality: 80,
            offers: [
              { slug: "cement", unitPrice: 99000, delivery: 9000, taxes: 4000, transaction: 1500, expectedRisk: 8000, capacityMonthly: 50000 },
            ],
          },
          {
            name: "Toshkent Optom Markaz",
            region: "Toshkent",
            reliability: 93,
            quality: 90,
            offers: [
              { slug: "cement", unitPrice: 111000, delivery: 14000, taxes: 4500, transaction: 2000, expectedRisk: 3000, capacityMonthly: 120000 },
              { slug: "flour", unitPrice: 9800, delivery: 400, taxes: 200, transaction: 80, expectedRisk: 150, capacityMonthly: 200000 },
              { slug: "sugar", unitPrice: 13200, delivery: 350, taxes: 250, transaction: 80, expectedRisk: 200, capacityMonthly: 90000 },
            ],
          },
          {
            name: "Kashkadaryo Agro",
            region: "Qarshi",
            reliability: 89,
            quality: 86,
            offers: [
              { slug: "flour", unitPrice: 8800, delivery: 350, taxes: 180, transaction: 70, expectedRisk: 220, capacityMonthly: 150000 },
              { slug: "cotton-oil", unitPrice: 19800, delivery: 600, taxes: 400, transaction: 120, expectedRisk: 500, capacityMonthly: 40000 },
              { slug: "fertilizer", unitPrice: 4550000, delivery: 120000, taxes: 90000, transaction: 25000, expectedRisk: 80000, capacityMonthly: 900 },
            ],
          },
          {
            name: "Zarafshon Oziq-ovqat",
            region: "Samarqand",
            reliability: 87,
            quality: 91,
            offers: [
              { slug: "rice", unitPrice: 16200, delivery: 700, taxes: 350, transaction: 100, expectedRisk: 400, capacityMonthly: 60000 },
              { slug: "dried-fruit", unitPrice: 39000, delivery: 900, taxes: 600, transaction: 150, expectedRisk: 800, capacityMonthly: 25000 },
            ],
          },
          {
            name: "Guliston Don",
            region: "Guliston",
            reliability: 82,
            quality: 84,
            offers: [
              { slug: "flour", unitPrice: 9100, delivery: 550, taxes: 180, transaction: 70, expectedRisk: 300, capacityMonthly: 80000 },
              { slug: "rice", unitPrice: 17000, delivery: 800, taxes: 350, transaction: 100, expectedRisk: 450, capacityMonthly: 30000 },
            ],
          },
        ],
      },
    };
  }
}

export function normalizeProvider<T>(record: ProviderRecord<T>): ProviderRecord<T> {
  if (!record.source) throw new Error("Provider record missing source");
  if (!record.collectedAt) throw new Error("Provider record missing timestamp");
  if (record.confidence < 0 || record.confidence > 1) throw new Error("Invalid confidence");
  return record;
}

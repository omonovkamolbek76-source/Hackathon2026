import { describe, expect, it } from "vitest";
import { extractEntities, extractProfile } from "./extract";

describe("extract", () => {
  it("parses the wow-moment query", () => {
    const e = extractEntities(
      "Men 200 mln so‘mlik mahsulot olib kelib sotmoqchiman. Qaysi mahsulotni olish foydaliroq?",
    );
    expect(e.intent).toBe("PROFITABILITY");
    expect(e.budgetSom).toBe(200_000_000);
    expect(e.language).toBe("uz");
    expect(e.missing).toContain("region");
  });

  it("extracts a zero-form profile", () => {
    const p = extractProfile(
      "Men Qarshida mebel ishlab chiqaraman, oyiga taxminan 200 mln aylanmam bor, yangi stanok olish uchun kredit kerak.",
    );
    expect(p.region).toBe("Qarshi");
    expect(p.monthlyRevenueSom).toBe(200_000_000);
    expect(p.industry).toBe("Furniture Manufacturing");
    expect(p.goal).toBe("Equipment financing");
  });
});

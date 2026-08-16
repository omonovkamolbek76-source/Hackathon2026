import { describe, expect, it } from "vitest";
import { assertSameTenant, can } from "./rbac";

describe("rbac", () => {
  it("keeps entrepreneurs in their tenant", () => {
    expect(can("ENTREPRENEUR", "ai:chat")).toBe(true);
    expect(can("ENTREPRENEUR", "admin:all")).toBe(false);
    expect(can("GOVERNMENT_ANALYST", "business:own")).toBe(false);
    expect(can("ADMIN", "ai:costs")).toBe(true);
    expect(assertSameTenant("b1", "b1")).toBe(true);
    expect(assertSameTenant("b1", "b2")).toBe(false);
  });
});

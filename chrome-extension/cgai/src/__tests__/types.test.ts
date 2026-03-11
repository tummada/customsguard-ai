import { describe, it, expect } from "vitest";
import { getTrafficColor, computeAuditRisk } from "@/types";
import type { CgDeclarationItem, CgLpiCache, CgFtaCache } from "@/types";

function makeItem(
  overrides: Partial<CgDeclarationItem> = {}
): CgDeclarationItem {
  return {
    localId: 1,
    declarationLocalId: 1,
    hsCode: "8471.30.10",
    quantity: "100",
    weight: "50",
    cifPrice: "1000",
    confidence: 0.85,
    ...overrides,
  };
}

function makeLpi(overrides: Partial<CgLpiCache> = {}): CgLpiCache {
  return {
    hsCode: "8471.30.10",
    controlType: "PERMIT",
    agencyCode: "FDA",
    agencyNameTh: "สำนักงานคณะกรรมการอาหารและยา",
    agencyNameEn: "FDA Thailand",
    requirementTh: "ต้องมีใบอนุญาต",
    requirementEn: "Permit required",
    appliesTo: "IMPORT",
    cachedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeFta(overrides: Partial<CgFtaCache> = {}): CgFtaCache {
  return {
    hsCode: "8471.30.10",
    ftaName: "ACFTA",
    partnerCountry: "CN",
    formType: "Form E",
    preferentialRate: 0,
    savingPercent: 5,
    conditions: null,
    cachedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("getTrafficColor", () => {
  it("returns blue when editStatus is EDITED", () => {
    expect(getTrafficColor(makeItem({ editStatus: "EDITED", confidence: 0.95 }))).toBe("blue");
  });

  it("returns yellow when confidence is 0.8 (no ftaAvailable param)", () => {
    // getTrafficColor takes only 1 argument now; 0.80 maps to yellow
    expect(getTrafficColor(makeItem({ confidence: 0.8 }))).toBe("yellow");
  });

  it("returns darkGreen for high confidence (0.95)", () => {
    expect(getTrafficColor(makeItem({ confidence: 0.95 }))).toBe("darkGreen");
  });

  it("returns green at boundary 0.91", () => {
    expect(getTrafficColor(makeItem({ confidence: 0.91 }))).toBe("green");
  });

  it("returns green at boundary 0.90", () => {
    // >= 0.90 returns green
    expect(getTrafficColor(makeItem({ confidence: 0.9 }))).toBe("green");
  });

  it("returns orange for medium confidence (0.72)", () => {
    expect(getTrafficColor(makeItem({ confidence: 0.72 }))).toBe("orange");
  });

  it("returns orange at boundary 0.70", () => {
    // >= 0.70 returns orange
    expect(getTrafficColor(makeItem({ confidence: 0.70 }))).toBe("orange");
  });

  it("returns red for low confidence (0.59)", () => {
    expect(getTrafficColor(makeItem({ confidence: 0.59 }))).toBe("red");
  });

  it("returns red when confidence is undefined", () => {
    expect(getTrafficColor(makeItem({ confidence: undefined }))).toBe("red");
  });

  it("EDITED overrides confidence", () => {
    expect(getTrafficColor(makeItem({ editStatus: "EDITED", confidence: 0.95 }))).toBe("blue");
  });
});

// ─── computeAuditRisk (Feature #6) ───

describe("computeAuditRisk", () => {
  // --- Step 1: Overrides ---
  it("returns green with confirmed=true for CONFIRMED items (override)", () => {
    const result = computeAuditRisk(
      makeItem({ editStatus: "CONFIRMED", isConfirmed: true, confidence: 0.3 }),
      [makeLpi()],
      []
    );
    expect(result.color).toBe("green");
    expect((result as any).confirmed).toBe(true);
    expect(result.score).toBe(0);
    expect(result.flags).toHaveLength(0);
  });

  it("returns green with confirmed=true for isConfirmed=true even without editStatus", () => {
    const result = computeAuditRisk(
      makeItem({ isConfirmed: true, confidence: 0.3 }),
      [],
      []
    );
    expect(result.color).toBe("green");
    expect((result as any).confirmed).toBe(true);
  });

  it("returns BLUE for EDITED items (override)", () => {
    const result = computeAuditRisk(
      makeItem({ editStatus: "EDITED", confidence: 0.3 }),
      [makeLpi()],
      []
    );
    expect(result.color).toBe("blue");
    expect(result.score).toBe(0);
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].type).toBe("USER_EDITED");
  });

  // --- Step 2: Flags ---
  it("returns RED when HS not found (confidence <=0.1 + aiReason ไม่พบ)", () => {
    const result = computeAuditRisk(
      makeItem({ confidence: 0.05, aiReason: "HS Code ไม่พบในฐานข้อมูล" }),
      [],
      []
    );
    expect(result.color).toBe("red");
    // HS_NOT_FOUND (error) + MISSING_VALUES not present since cifPrice=1000, qty=100, weight=50 from defaults
    // but confidence 0.05 < 0.70 so color is red
    expect(result.flags.some(f => f.type === "HS_NOT_FOUND")).toBe(true);
  });

  it("returns RED when confidence < 0.70", () => {
    const result = computeAuditRisk(
      makeItem({ confidence: 0.59 }),
      [],
      []
    );
    expect(result.color).toBe("red");
    // No LOW_CONFIDENCE flag in current implementation — color comes from confidence level
  });

  it("flags MISSING_VALUES when CIF price is 0", () => {
    const result = computeAuditRisk(
      makeItem({ cifPrice: "0", confidence: 0.9 }),
      [],
      []
    );
    // confidence 0.9 → green color
    expect(result.color).toBe("green");
    expect(result.flags.some(f => f.type === "MISSING_VALUES")).toBe(true);
    expect(result.flags.find(f => f.type === "MISSING_VALUES")!.message).toContain("CIF Price");
  });

  it("flags MISSING_VALUES when quantity is missing", () => {
    const result = computeAuditRisk(
      makeItem({ quantity: undefined, confidence: 0.9 }),
      [],
      []
    );
    expect(result.color).toBe("green");
    expect(result.flags.some(f => f.type === "MISSING_VALUES")).toBe(true);
    expect(result.flags.find(f => f.type === "MISSING_VALUES")!.message).toContain("Quantity");
  });

  it("flags MISSING_VALUES when weight is missing", () => {
    const result = computeAuditRisk(
      makeItem({ weight: undefined, confidence: 0.9 }),
      [],
      []
    );
    expect(result.color).toBe("green");
    expect(result.flags.some(f => f.type === "MISSING_VALUES")).toBe(true);
    expect(result.flags.find(f => f.type === "MISSING_VALUES")!.message).toContain("Weight");
  });

  it("flags MISSING_VALUES with multiple missing values listed", () => {
    const result = computeAuditRisk(
      makeItem({ cifPrice: "", quantity: undefined, weight: undefined, confidence: 0.9 }),
      [],
      []
    );
    expect(result.color).toBe("green");
    const missingFlag = result.flags.find(f => f.type === "MISSING_VALUES")!;
    expect(missingFlag.message).toContain("CIF Price");
    expect(missingFlag.message).toContain("Quantity");
    expect(missingFlag.message).toContain("Weight");
  });

  // --- Step 3: Scoring based on error/warning counts ---
  it("returns darkGreen with score 0 when all clean (no flags)", () => {
    const result = computeAuditRisk(makeItem({ confidence: 0.95 }), [], []);
    expect(result.color).toBe("darkGreen");
    expect(result.score).toBe(0);
    expect(result.flags).toHaveLength(0);
    expect(result.summary).toBe("ผ่าน");
  });

  it("adds warning score for 1 LPI agency", () => {
    const result = computeAuditRisk(
      makeItem({ confidence: 0.95 }),
      [makeLpi()],
      []
    );
    expect(result.color).toBe("darkGreen");
    // 1 warning * 0.15 = 0.15
    expect(result.score).toBeCloseTo(0.15);
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].type).toBe("LPI_REQUIRED");
    expect(result.flags[0].severity).toBe("warning");
  });

  it("adds warning score for 2+ LPI agencies", () => {
    const result = computeAuditRisk(
      makeItem({ confidence: 0.95 }),
      [makeLpi(), makeLpi({ agencyCode: "TISI" })],
      []
    );
    expect(result.color).toBe("darkGreen");
    // 1 warning (LPI_REQUIRED for 2+ agencies) * 0.15 = 0.15
    expect(result.score).toBeCloseTo(0.15);
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].type).toBe("LPI_REQUIRED");
  });

  it("adds warning score for high duty (baseRate >= 30%)", () => {
    const result = computeAuditRisk(
      makeItem({ confidence: 0.95 }),
      [],
      [makeFta({ preferentialRate: 5, savingPercent: 25 })] // base = 30
    );
    expect(result.color).toBe("darkGreen");
    // 1 warning (HIGH_DUTY) + 1 info (FTA_SAVINGS) => 0.15
    expect(result.score).toBeCloseTo(0.15);
    expect(result.flags.some(f => f.type === "HIGH_DUTY")).toBe(true);
  });

  it("orange color for confidence 0.7", () => {
    const result = computeAuditRisk(
      makeItem({ confidence: 0.7 }),
      [],
      []
    );
    // confidence 0.70 → orange color, no flags (quantity/weight/cifPrice are set in makeItem)
    expect(result.color).toBe("orange");
    expect(result.score).toBe(0);
  });

  it("combines LPI(2) + orange confidence", () => {
    const result = computeAuditRisk(
      makeItem({ confidence: 0.7 }),
      [makeLpi(), makeLpi({ agencyCode: "TISI" })],
      []
    );
    // color from confidence: orange
    expect(result.color).toBe("orange");
    // 1 warning (LPI_REQUIRED) => score = 0.15
    expect(result.score).toBeCloseTo(0.15);
  });

  it("combines LPI(1) + high duty + orange confidence", () => {
    const result = computeAuditRisk(
      makeItem({ confidence: 0.7 }),
      [makeLpi()],
      [makeFta({ preferentialRate: 10, savingPercent: 25 })] // base = 35
    );
    // color from confidence: orange
    expect(result.color).toBe("orange");
    // 2 warnings (LPI_REQUIRED + HIGH_DUTY) + 1 info (FTA_SAVINGS) => 0.30
    expect(result.score).toBeCloseTo(0.30);
  });

  it("score caps at 1.0", () => {
    const result = computeAuditRisk(
      makeItem({ confidence: 0.7 }),
      [makeLpi(), makeLpi({ agencyCode: "TISI" })],
      [makeFta({ preferentialRate: 10, savingPercent: 25 })]
    );
    expect(result.score).toBeLessThanOrEqual(1.0);
    expect(result.color).toBe("orange");
  });

  // --- Edge cases ---
  it("handles undefined confidence (defaults to 0 → RED)", () => {
    const result = computeAuditRisk(
      makeItem({ confidence: undefined }),
      [],
      []
    );
    expect(result.color).toBe("red");
  });

  it("CONFIRMED overrides everything including LPI + low confidence", () => {
    const result = computeAuditRisk(
      makeItem({ editStatus: "CONFIRMED", isConfirmed: true, confidence: 0.1 }),
      [makeLpi(), makeLpi({ agencyCode: "TISI" })],
      []
    );
    expect(result.color).toBe("green");
    expect((result as any).confirmed).toBe(true);
    expect(result.flags).toHaveLength(0);
  });
});

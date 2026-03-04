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

  it("returns gold when ftaAvailable is true", () => {
    expect(getTrafficColor(makeItem({ confidence: 0.8 }), true)).toBe("gold");
  });

  it("returns green for high confidence (0.95)", () => {
    expect(getTrafficColor(makeItem({ confidence: 0.95 }))).toBe("green");
  });

  it("returns green at boundary 0.91", () => {
    expect(getTrafficColor(makeItem({ confidence: 0.91 }))).toBe("green");
  });

  it("returns orange at boundary 0.90 (not > 0.9)", () => {
    expect(getTrafficColor(makeItem({ confidence: 0.9 }))).toBe("orange");
  });

  it("returns orange for medium confidence (0.72)", () => {
    expect(getTrafficColor(makeItem({ confidence: 0.72 }))).toBe("orange");
  });

  it("returns orange at boundary 0.60", () => {
    expect(getTrafficColor(makeItem({ confidence: 0.6 }))).toBe("orange");
  });

  it("returns red for low confidence (0.59)", () => {
    expect(getTrafficColor(makeItem({ confidence: 0.59 }))).toBe("red");
  });

  it("returns red when confidence is undefined", () => {
    expect(getTrafficColor(makeItem({ confidence: undefined }))).toBe("red");
  });

  it("EDITED overrides ftaAvailable", () => {
    expect(getTrafficColor(makeItem({ editStatus: "EDITED" }), true)).toBe("blue");
  });
});

// ─── computeAuditRisk (Feature #6) ───

describe("computeAuditRisk", () => {
  // --- Step 1: Overrides ---
  it("returns GOLD for CONFIRMED items (override)", () => {
    const result = computeAuditRisk(
      makeItem({ editStatus: "CONFIRMED", isConfirmed: true, confidence: 0.3 }),
      [makeLpi()],
      []
    );
    expect(result.color).toBe("gold");
    expect(result.score).toBe(0);
    expect(result.flags).toHaveLength(0);
  });

  it("returns GOLD for isConfirmed=true even without editStatus", () => {
    const result = computeAuditRisk(
      makeItem({ isConfirmed: true, confidence: 0.3 }),
      [],
      []
    );
    expect(result.color).toBe("gold");
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

  // --- Step 2: Critical → RED ---
  it("returns RED when HS not found (confidence <=0.1 + aiReason ไม่พบ)", () => {
    const result = computeAuditRisk(
      makeItem({ confidence: 0.05, aiReason: "HS Code ไม่พบในฐานข้อมูล" }),
      [],
      []
    );
    expect(result.color).toBe("red");
    expect(result.score).toBe(1.0);
    expect(result.flags[0].type).toBe("HS_NOT_FOUND");
  });

  it("returns RED when confidence < 0.6", () => {
    const result = computeAuditRisk(
      makeItem({ confidence: 0.59 }),
      [],
      []
    );
    expect(result.color).toBe("red");
    expect(result.flags[0].type).toBe("LOW_CONFIDENCE");
  });

  it("returns RED when CIF price is 0", () => {
    const result = computeAuditRisk(
      makeItem({ cifPrice: "0", confidence: 0.9 }),
      [],
      []
    );
    expect(result.color).toBe("red");
    expect(result.flags[0].type).toBe("MISSING_VALUES");
    expect(result.flags[0].message).toContain("CIF Price");
  });

  it("returns RED when quantity is missing", () => {
    const result = computeAuditRisk(
      makeItem({ quantity: undefined, confidence: 0.9 }),
      [],
      []
    );
    expect(result.color).toBe("red");
    expect(result.flags[0].message).toContain("Quantity");
  });

  it("returns RED when weight is missing", () => {
    const result = computeAuditRisk(
      makeItem({ weight: undefined, confidence: 0.9 }),
      [],
      []
    );
    expect(result.color).toBe("red");
    expect(result.flags[0].message).toContain("Weight");
  });

  it("returns RED with multiple missing values listed", () => {
    const result = computeAuditRisk(
      makeItem({ cifPrice: "", quantity: undefined, weight: undefined, confidence: 0.9 }),
      [],
      []
    );
    expect(result.color).toBe("red");
    expect(result.flags[0].message).toContain("CIF Price");
    expect(result.flags[0].message).toContain("Quantity");
    expect(result.flags[0].message).toContain("Weight");
  });

  // --- Step 3: Additive scoring ---
  it("returns GREEN when all clean (no flags)", () => {
    const result = computeAuditRisk(makeItem({ confidence: 0.95 }), [], []);
    expect(result.color).toBe("green");
    expect(result.score).toBe(0);
    expect(result.flags).toHaveLength(0);
    expect(result.summary).toBe("ผ่าน");
  });

  it("adds +0.15 for 1 LPI agency (stays green if no other flags)", () => {
    const result = computeAuditRisk(
      makeItem({ confidence: 0.95 }),
      [makeLpi()],
      []
    );
    expect(result.color).toBe("green");
    expect(result.score).toBeCloseTo(0.15);
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].type).toBe("LPI_REQUIRED");
    expect(result.flags[0].severity).toBe("warning");
  });

  it("adds +0.3 for 2+ LPI agencies (score < 0.4 → still green)", () => {
    const result = computeAuditRisk(
      makeItem({ confidence: 0.95 }),
      [makeLpi(), makeLpi({ agencyCode: "TISI" })],
      []
    );
    // 0.3 < 0.4 threshold → green
    expect(result.color).toBe("green");
    expect(result.score).toBeCloseTo(0.3);
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].type).toBe("LPI_REQUIRED");
  });

  it("adds +0.15 for high duty (baseRate >= 30%)", () => {
    const result = computeAuditRisk(
      makeItem({ confidence: 0.95 }),
      [],
      [makeFta({ preferentialRate: 5, savingPercent: 25 })] // base = 30
    );
    expect(result.color).toBe("green");
    expect(result.score).toBeCloseTo(0.15);
    expect(result.flags[0].type).toBe("HIGH_DUTY");
  });

  it("adds +0.1 for medium confidence (0.6-0.8)", () => {
    const result = computeAuditRisk(
      makeItem({ confidence: 0.7 }),
      [],
      []
    );
    expect(result.color).toBe("green");
    expect(result.score).toBeCloseTo(0.1);
    expect(result.flags[0].type).toBe("LOW_CONFIDENCE");
    expect(result.flags[0].severity).toBe("info");
  });

  it("combines LPI(2) + medium confidence → ORANGE (0.3+0.1=0.4)", () => {
    const result = computeAuditRisk(
      makeItem({ confidence: 0.7 }),
      [makeLpi(), makeLpi({ agencyCode: "TISI" })],
      []
    );
    expect(result.color).toBe("orange");
    expect(result.score).toBeCloseTo(0.4);
  });

  it("combines LPI(1) + high duty + medium confidence → ORANGE (0.15+0.15+0.1=0.4)", () => {
    const result = computeAuditRisk(
      makeItem({ confidence: 0.7 }),
      [makeLpi()],
      [makeFta({ preferentialRate: 10, savingPercent: 25 })] // base = 35
    );
    expect(result.color).toBe("orange");
    expect(result.score).toBeCloseTo(0.4);
  });

  it("score caps at 1.0", () => {
    const result = computeAuditRisk(
      makeItem({ confidence: 0.7 }),
      [makeLpi(), makeLpi({ agencyCode: "TISI" })],
      [makeFta({ preferentialRate: 10, savingPercent: 25 })]
    );
    // 0.3 + 0.15 + 0.1 = 0.55
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
    expect(result.color).toBe("gold");
    expect(result.flags).toHaveLength(0);
  });
});

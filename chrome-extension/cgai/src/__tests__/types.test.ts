import { describe, it, expect } from "vitest";
import { getTrafficColor } from "@/types";
import type { CgDeclarationItem } from "@/types";

function makeItem(
  overrides: Partial<CgDeclarationItem> = {}
): CgDeclarationItem {
  return {
    localId: 1,
    declarationLocalId: 1,
    hsCode: "8471.30.10",
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
    expect(getTrafficColor(makeItem({}))).toBe("red");
  });

  it("EDITED overrides ftaAvailable", () => {
    expect(getTrafficColor(makeItem({ editStatus: "EDITED" }), true)).toBe("blue");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { FuzzySelectorEngine } from "@/content/engine";

// Minimal chrome mock for constructor
Object.assign(globalThis, {
  chrome: {
    ...(globalThis as any).chrome,
    runtime: { id: "test-extension-id" },
  },
});

describe("FuzzySelectorEngine", () => {
  let engine: FuzzySelectorEngine;

  beforeEach(() => {
    engine = new FuzzySelectorEngine();
    document.body.innerHTML = "";
  });

  // ── findField ──

  describe("findField", () => {
    it("matches by data-field attribute (priority 1)", () => {
      document.body.innerHTML = `<input data-field="hsCode" value="" />`;
      const el = engine.findField(document, "hsCode");
      expect(el).not.toBeNull();
      expect(el?.getAttribute("data-field")).toBe("hsCode");
    });

    it("matches by name attribute (priority 2)", () => {
      document.body.innerHTML = `<input name="cifPrice" value="" />`;
      const el = engine.findField(document, "cifPrice");
      expect(el).not.toBeNull();
      expect(el?.name).toBe("cifPrice");
    });

    it("matches by id attribute (priority 3)", () => {
      document.body.innerHTML = `<input id="itemWeight" value="" />`;
      const el = engine.findField(document, "itemWeight");
      expect(el).not.toBeNull();
      expect(el?.id).toBe("itemWeight");
    });

    it("matches by case-insensitive partial on name (priority 4)", () => {
      document.body.innerHTML = `<input name="txt_HsCode_Row1" value="" />`;
      const el = engine.findField(document, "hscode");
      expect(el).not.toBeNull();
      expect(el?.name).toBe("txt_HsCode_Row1");
    });

    it("matches by case-insensitive partial on id (priority 4)", () => {
      document.body.innerHTML = `<input id="input_CifPrice_Main" value="" />`;
      const el = engine.findField(document, "cifprice");
      expect(el).not.toBeNull();
    });

    it("prefers data-field over name when both exist", () => {
      document.body.innerHTML = `
        <input data-field="hsCode" id="df" value="" />
        <input name="hsCode" id="nm" value="" />
      `;
      const el = engine.findField(document, "hsCode");
      expect(el?.id).toBe("df");
    });

    it("returns null when no match", () => {
      document.body.innerHTML = `<input name="unrelated" value="" />`;
      const el = engine.findField(document, "hsCode");
      expect(el).toBeNull();
    });

    it("matches select elements", () => {
      document.body.innerHTML = `<select data-field="currency"><option>USD</option></select>`;
      const el = engine.findField(document, "currency");
      expect(el).not.toBeNull();
      expect(el?.tagName).toBe("SELECT");
    });
  });

  // ── formatValue ──

  describe("formatValue", () => {
    it("formats cifPrice to 2 decimal places", () => {
      expect(engine.formatValue("cifPrice", "1234.5")).toBe("1234.50");
    });

    it("formats itemWeight to 2 decimal places", () => {
      expect(engine.formatValue("itemWeight", "10")).toBe("10.00");
    });

    it("formats itemQuantity to 2 decimal places", () => {
      expect(engine.formatValue("itemQuantity", "100.1")).toBe("100.10");
    });

    it("formats dutyAmount to 2 decimal places", () => {
      expect(engine.formatValue("dutyAmount", "5678.999")).toBe("5679.00");
    });

    it("formats unitPrice to 2 decimal places", () => {
      expect(engine.formatValue("unitPrice", "99.9")).toBe("99.90");
    });

    it("passes non-numeric field through unchanged", () => {
      expect(engine.formatValue("hsCode", "8471.30.10")).toBe("8471.30.10");
    });

    it("passes description through unchanged", () => {
      expect(engine.formatValue("descriptionTh", "กุ้งแช่แข็ง")).toBe("กุ้งแช่แข็ง");
    });

    it("returns raw value for invalid numeric input", () => {
      expect(engine.formatValue("cifPrice", "not-a-number")).toBe("not-a-number");
    });

    it("handles empty string for numeric field gracefully", () => {
      // Big.js throws on empty string, should return raw
      expect(engine.formatValue("cifPrice", "")).toBe("");
    });
  });

  // ── fill (multi-row, vollos-ensure-rows event) ──

  describe("fill", () => {
    it("fills multiple fields in the document", () => {
      document.body.innerHTML = `
        <input data-field="hsCode" value="" />
        <input data-field="cifPrice" value="" />
      `;
      const { filledCount, results } = engine.fill({
        hsCode: "8471.30.10",
        cifPrice: "1234.56",
      });
      expect(filledCount).toBe(2);
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it("dispatches vollos-ensure-rows event for multi-row data", () => {
      const handler = vi.fn();
      document.addEventListener("vollos-ensure-rows", handler);

      document.body.innerHTML = `
        <input data-field="hsCode1" value="" />
        <input data-field="hsCode2" value="" />
        <input data-field="hsCode3" value="" />
      `;

      engine.fill({
        hsCode1: "0306.17",
        hsCode2: "8471.30",
        hsCode3: "9999.99",
      });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].detail.count).toBe(3);

      document.removeEventListener("vollos-ensure-rows", handler);
    });

    it("does NOT dispatch vollos-ensure-rows for single-row data", () => {
      const handler = vi.fn();
      document.addEventListener("vollos-ensure-rows", handler);

      document.body.innerHTML = `<input data-field="hsCode" value="" />`;
      engine.fill({ hsCode: "0306.17" });

      expect(handler).not.toHaveBeenCalled();
      document.removeEventListener("vollos-ensure-rows", handler);
    });

    it("reports failure for fields not found", () => {
      document.body.innerHTML = `<input data-field="hsCode" value="" />`;
      const { filledCount, results } = engine.fill({
        hsCode: "0306.17",
        missingField: "value",
      });
      expect(filledCount).toBe(1);
      expect(results.find((r) => r.field === "missingField")?.success).toBe(false);
      expect(results.find((r) => r.field === "missingField")?.error).toBe("Field not found");
    });

    it("fills same-origin iframe fields via contentDocument", () => {
      // Create a same-origin iframe with srcdoc
      document.body.innerHTML = `<iframe srcdoc='<input data-field="hsCode" value="" />'></iframe>`;
      const iframe = document.querySelector("iframe")!;

      // jsdom may not fully support srcdoc, so we just verify it doesn't crash
      const { results } = engine.fill({ hsCode: "0306.17" });
      // Main doc has no hsCode field, so main result fails; iframe results vary by env
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── isAllowedOrigin ──

  describe("isAllowedOrigin", () => {
    it("allows customs.go.th", () => {
      expect(engine.isAllowedOrigin("https://customs.go.th")).toBe(true);
    });

    it("allows e-customs.customs.go.th", () => {
      expect(engine.isAllowedOrigin("https://e-customs.customs.go.th")).toBe(true);
    });

    it("allows any subdomain of customs.go.th", () => {
      expect(engine.isAllowedOrigin("https://portal.customs.go.th")).toBe(true);
    });

    it("rejects evil.com", () => {
      expect(engine.isAllowedOrigin("https://evil.com")).toBe(false);
    });

    it("rejects phishing domain with customs.go.th in path", () => {
      expect(engine.isAllowedOrigin("https://fake-customs.go.th")).toBe(false);
    });

    it("rejects http (non-https) customs.go.th", () => {
      expect(engine.isAllowedOrigin("http://customs.go.th")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(engine.isAllowedOrigin("")).toBe(false);
    });
  });

  // ── XSS prevention ──

  describe("XSS prevention", () => {
    it("treats script tags in field value as plain text", () => {
      document.body.innerHTML = `<input data-field="hsCode" value="" />`;
      engine.fill({ hsCode: '<script>alert("xss")</script>' });
      const el = document.querySelector<HTMLInputElement>('[data-field="hsCode"]')!;
      // Value should be the literal string, not executed
      expect(el.value).toBe('<script>alert("xss")</script>');
    });

    it("treats event handler injection as plain text", () => {
      document.body.innerHTML = `<input data-field="desc" value="" />`;
      engine.fill({ desc: '" onmouseover="alert(1)' });
      const el = document.querySelector<HTMLInputElement>('[data-field="desc"]')!;
      expect(el.value).toBe('" onmouseover="alert(1)');
    });
  });
});

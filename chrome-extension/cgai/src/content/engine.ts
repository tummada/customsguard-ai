import Big from "big.js";

interface FieldMapping {
  selector: string;
  dataField: string;
}

interface FillResult {
  field: string;
  success: boolean;
  error?: string;
}

const ALLOWED_ORIGINS = [
  "https://customs.go.th",
  "https://e-customs.customs.go.th",
];

// Numeric fields that require Big.js precision for customs-grade accuracy
const NUMERIC_FIELDS = new Set(["cifPrice", "itemWeight", "itemQuantity", "dutyAmount", "unitPrice"]);

export class FuzzySelectorEngine {
  private extensionOrigin: string;

  constructor() {
    this.extensionOrigin = typeof chrome !== "undefined" && chrome.runtime?.id
      ? `chrome-extension://${chrome.runtime.id}`
      : window.location.origin;
  }

  // Find input elements by data-field attribute, name, or id (fuzzy matching)
  findField(doc: Document, fieldName: string): HTMLInputElement | HTMLSelectElement | null {
    // Priority 1: data-field attribute (most reliable)
    const byDataField = doc.querySelector<HTMLInputElement | HTMLSelectElement>(
      `[data-field="${fieldName}"]`
    );
    if (byDataField) return byDataField;

    // Priority 2: exact name match
    const byName = doc.querySelector<HTMLInputElement | HTMLSelectElement>(
      `[name="${fieldName}"]`
    );
    if (byName) return byName;

    // Priority 3: exact id match
    const byId = doc.getElementById(fieldName) as HTMLInputElement | HTMLSelectElement | null;
    if (byId) return byId;

    // Priority 4: case-insensitive partial match on name/id
    const allInputs = doc.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select");
    const lowerField = fieldName.toLowerCase();
    for (const el of allInputs) {
      const name = (el.name || "").toLowerCase();
      const id = (el.id || "").toLowerCase();
      if (name.includes(lowerField) || id.includes(lowerField)) {
        return el;
      }
    }

    return null;
  }

  // Format value with Big.js for numeric customs fields
  formatValue(fieldName: string, rawValue: string): string {
    if (!NUMERIC_FIELDS.has(fieldName)) return rawValue;

    try {
      return new Big(rawValue).toFixed(2);
    } catch {
      return rawValue;
    }
  }

  // Trigger realistic input events so frameworks (React, Angular, Vue) detect the change
  triggerEvents(element: HTMLInputElement | HTMLSelectElement): void {
    const inputEvent = new Event("input", { bubbles: true });
    const changeEvent = new Event("change", { bubbles: true });
    const blurEvent = new FocusEvent("blur", { bubbles: true });

    element.dispatchEvent(inputEvent);
    element.dispatchEvent(changeEvent);
    element.dispatchEvent(blurEvent);
  }

  // Fill a single field in a document
  fillField(doc: Document, fieldName: string, value: string): FillResult {
    const element = this.findField(doc, fieldName);

    if (!element) {
      return { field: fieldName, success: false, error: "Field not found" };
    }

    const formattedValue = this.formatValue(fieldName, value);

    // Set value using native setter to bypass React/framework wrappers
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set;

    if (nativeInputValueSetter && element instanceof HTMLInputElement) {
      nativeInputValueSetter.call(element, formattedValue);
    } else {
      element.value = formattedValue;
    }

    this.triggerEvents(element);

    return { field: fieldName, success: true };
  }

  // Fill all fields in the current document (non-iframe)
  fillDocument(doc: Document, data: Record<string, string>): FillResult[] {
    const results: FillResult[] = [];
    for (const [field, value] of Object.entries(data)) {
      results.push(this.fillField(doc, field, value));
    }
    return results;
  }

  // Recursive iFrame search: post message to all iframes
  fillIframes(data: Record<string, string>): FillResult[] {
    const results: FillResult[] = [];
    const iframes = document.querySelectorAll("iframe");
    for (const iframe of iframes) {
      try {
        // Try same-origin direct access first (works for srcdoc iframes)
        const iframeDoc = iframe.contentDocument;
        if (iframeDoc) {
          for (const [field, value] of Object.entries(data)) {
            results.push(this.fillField(iframeDoc, field, this.formatValue(field, value)));
          }
          continue;
        }
      } catch {
        // Cross-origin: fall through to postMessage
      }

      // Cross-origin: use postMessage with origin validation
      if (iframe.contentWindow) {
        const iframeSrc = iframe.src || "";
        const targetOrigin = ALLOWED_ORIGINS.find((o) => iframeSrc.startsWith(o));
        if (targetOrigin) {
          iframe.contentWindow.postMessage(
            {
              type: "VOLLOS_MAGIC_FILL",
              payload: data,
              origin: this.extensionOrigin,
            },
            targetOrigin
          );
        } else {
          console.warn(`[VOLLOS] Skipped postMessage to untrusted iframe: ${iframeSrc}`);
        }
      }
    }
    return results;
  }

  // Count how many item rows the payload needs (based on numbered field suffixes)
  private countNeededRows(data: Record<string, string>): number {
    let maxRow = 0;
    for (const key of Object.keys(data)) {
      // Extract trailing number: hsCode2 → 2, cifPrice3 → 3, hsCode → 1
      const match = key.match(/(\d+)$/);
      const rowNum = match ? parseInt(match[1], 10) : 1;
      if (rowNum > maxRow) maxRow = rowNum;
    }
    return maxRow;
  }

  // Main entry: fill all fields in page + iframes
  fill(data: Record<string, string>): { filledCount: number; results: FillResult[] } {
    // Dispatch event so the page can auto-create rows before we fill
    const neededRows = this.countNeededRows(data);
    if (neededRows > 1) {
      document.dispatchEvent(
        new CustomEvent("vollos-ensure-rows", { detail: { count: neededRows } })
      );
    }

    const mainResults = this.fillDocument(document, data);
    const iframeResults = this.fillIframes(data);
    const results = [...mainResults, ...iframeResults];

    const filledCount = results.filter((r) => r.success).length;
    return { filledCount, results };
  }

  // Validate incoming postMessage origin
  isAllowedOrigin(origin: string): boolean {
    return ALLOWED_ORIGINS.includes(origin);
  }
}

// Listen for postMessage from parent frames (cross-origin iFrame fill)
export function setupIframeListener(engine: FuzzySelectorEngine): void {
  window.addEventListener("message", (event) => {
    if (event.data?.type !== "VOLLOS_MAGIC_FILL") return;

    // Origin validation for security
    if (!engine.isAllowedOrigin(event.origin)) {
      console.warn(`[VOLLOS] Rejected message from untrusted origin: ${event.origin}`);
      return;
    }

    const data = event.data.payload as Record<string, string>;

    // Auto-create rows inside iframe too
    const neededRows = engine["countNeededRows"](data);
    if (neededRows > 1) {
      document.dispatchEvent(
        new CustomEvent("vollos-ensure-rows", { detail: { count: neededRows } })
      );
    }

    engine.fillDocument(document, data);
  });
}

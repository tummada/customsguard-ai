import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock api-client module
const mockApiClient = {
  isConfigured: vi.fn().mockReturnValue(true),
  loadConfig: vi.fn().mockResolvedValue(true),
  configure: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn().mockResolvedValue(undefined),
  scanPdf: vi.fn(),
  getJobStatus: vi.fn(),
  hsLookup: vi.fn(),
  ragSearch: vi.fn(),
};

vi.mock("@/lib/api-client", () => ({
  apiClient: mockApiClient,
  QuotaExceededError: class QuotaExceededError extends Error {
    public readonly quota: unknown;
    constructor(quota: unknown) {
      super("Quota exceeded");
      this.name = "QuotaExceededError";
      this.quota = quota;
    }
  },
}));

// Mock ai-proxy module
const mockSubmitScan = vi.fn();
const mockPollResult = vi.fn();

vi.mock("@/background/ai-proxy", () => ({
  submitScanToBackend: mockSubmitScan,
  pollScanResult: mockPollResult,
}));

// Mock chrome.sidePanel
const chromeMock = {
  ...(globalThis as any).chrome,
  sidePanel: {
    setPanelBehavior: vi.fn().mockResolvedValue(undefined),
  },
  runtime: {
    ...(globalThis as any).chrome?.runtime,
    onInstalled: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
    sendMessage: vi.fn(),
  },
  storage: (globalThis as any).chrome?.storage,
};
Object.assign(globalThis, { chrome: chromeMock });

// We need to capture the message listener registered by background/index.ts
let messageListener: (
  message: any,
  sender: any,
  sendResponse: (response: unknown) => void
) => boolean | void;

// Override addListener to capture the handler
chromeMock.runtime.onMessage.addListener = vi.fn((fn: any) => {
  messageListener = fn;
});

// Now import the background module to register the listener
// We do a dynamic import so mocks are in place first
beforeEach(async () => {
  vi.clearAllMocks();
  mockApiClient.isConfigured.mockReturnValue(true);
  mockApiClient.loadConfig.mockResolvedValue(true);

  // Re-import to re-register the listener
  vi.resetModules();

  // Re-apply mocks after resetModules
  vi.doMock("@/lib/api-client", () => ({
    apiClient: mockApiClient,
    QuotaExceededError: class QuotaExceededError extends Error {
      public readonly quota: unknown;
      constructor(quota: unknown) {
        super("Quota exceeded");
        this.name = "QuotaExceededError";
        this.quota = quota;
      }
    },
  }));
  vi.doMock("@/background/ai-proxy", () => ({
    submitScanToBackend: mockSubmitScan,
    pollScanResult: mockPollResult,
  }));

  await import("@/background/index");
});

// Helper to send a message and get the response
function sendMessage(message: any): Promise<any> {
  return new Promise((resolve) => {
    messageListener(message, {}, resolve);
  });
}

describe("Background worker message handler", () => {
  // ── SCAN_PDF ──

  describe("SCAN_PDF", () => {
    it("returns success with items on successful scan", async () => {
      const items = [
        { hsCode: "0306.17", confidence: 0.95, sourcePageIndex: 0 },
      ];
      mockSubmitScan.mockResolvedValue({ jobId: "job-123" });
      mockPollResult.mockResolvedValue(items);

      const response = await sendMessage({
        type: "SCAN_PDF",
        payload: { pdfDataUrl: "data:application/pdf;base64,AAAA" },
      });

      expect(response.success).toBe(true);
      expect(response.items).toEqual(items);
      expect(response.jobId).toBe("job-123");
    });

    it("returns error when apiClient is not configured", async () => {
      mockApiClient.isConfigured.mockReturnValue(false);
      mockApiClient.loadConfig.mockResolvedValue(false);

      const response = await sendMessage({
        type: "SCAN_PDF",
        payload: { pdfDataUrl: "data:application/pdf;base64,AAAA" },
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain("เข้าสู่ระบบ");
    });

    it("returns error when scan submission fails", async () => {
      mockSubmitScan.mockRejectedValue(new Error("Network error"));

      const response = await sendMessage({
        type: "SCAN_PDF",
        payload: { pdfDataUrl: "data:application/pdf;base64,AAAA" },
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe("Network error");
    });

    it("returns error when poll times out", async () => {
      mockSubmitScan.mockResolvedValue({ jobId: "job-timeout" });
      mockPollResult.mockRejectedValue(new Error("Scan job timed out after 120000ms"));

      const response = await sendMessage({
        type: "SCAN_PDF",
        payload: { pdfDataUrl: "data:application/pdf;base64,AAAA" },
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain("timed out");
    });

    it("returns QUOTA_EXCEEDED when quota is exhausted", async () => {
      const { QuotaExceededError } = await import("@/lib/api-client");
      const quotaData = {
        error: "QUOTA_EXCEEDED",
        usageType: "scan",
        current: 10,
        limit: 10,
        plan: "FREE",
        message: "Quota exceeded",
        upgradeUrl: "https://vollos.ai/pricing",
      };
      mockSubmitScan.mockRejectedValue(new QuotaExceededError(quotaData));

      const response = await sendMessage({
        type: "SCAN_PDF",
        payload: { pdfDataUrl: "data:application/pdf;base64,AAAA" },
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe("QUOTA_EXCEEDED");
      expect(response.quotaExceeded).toBeDefined();
    });

    it("reloads config if apiClient was not configured (service worker restart)", async () => {
      mockApiClient.isConfigured
        .mockReturnValueOnce(false)  // first check
        .mockReturnValueOnce(true);  // after loadConfig
      mockSubmitScan.mockResolvedValue({ jobId: "j1" });
      mockPollResult.mockResolvedValue([]);

      const response = await sendMessage({
        type: "SCAN_PDF",
        payload: { pdfDataUrl: "data:application/pdf;base64,AAAA" },
      });

      expect(mockApiClient.loadConfig).toHaveBeenCalled();
      expect(response.success).toBe(true);
    });
  });

  // ── SET_AUTH ──

  describe("SET_AUTH", () => {
    it("configures apiClient with token and tenantId", async () => {
      const response = await sendMessage({
        type: "SET_AUTH",
        payload: { token: "jwt-tok", tenantId: "tenant-1" },
      });

      expect(response.success).toBe(true);
      expect(mockApiClient.configure).toHaveBeenCalledWith("jwt-tok", "tenant-1");
    });

    it("returns failure when configure throws", async () => {
      mockApiClient.configure.mockRejectedValue(new Error("Storage error"));

      const response = await sendMessage({
        type: "SET_AUTH",
        payload: { token: "jwt-tok", tenantId: "tenant-1" },
      });

      expect(response.success).toBe(false);
    });
  });

  // ── FTA_LOOKUP ──

  describe("FTA_LOOKUP", () => {
    it("returns lookup results for batch codes", async () => {
      const results = [
        { code: "0306.17", found: true, ftaAlerts: [] },
        { code: "8471.30", found: true, ftaAlerts: [] },
      ];
      mockApiClient.hsLookup.mockResolvedValue(results);

      const response = await sendMessage({
        type: "FTA_LOOKUP",
        payload: { codes: ["0306.17", "8471.30"], originCountry: "CN" },
      });

      expect(response.success).toBe(true);
      expect(response.results).toEqual(results);
      expect(mockApiClient.hsLookup).toHaveBeenCalledWith(
        ["0306.17", "8471.30"],
        "CN"
      );
    });

    it("returns error when lookup fails", async () => {
      mockApiClient.hsLookup.mockRejectedValue(new Error("API error"));

      const response = await sendMessage({
        type: "FTA_LOOKUP",
        payload: { codes: ["0306.17"] },
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe("API error");
    });

    it("auto-loads config if not configured", async () => {
      mockApiClient.isConfigured.mockReturnValueOnce(false);
      mockApiClient.hsLookup.mockResolvedValue([]);

      await sendMessage({
        type: "FTA_LOOKUP",
        payload: { codes: ["0306.17"] },
      });

      expect(mockApiClient.loadConfig).toHaveBeenCalled();
    });
  });

  // ── RAG_SEARCH ──

  describe("RAG_SEARCH", () => {
    it("returns search results on success", async () => {
      const result = {
        answer: "กุ้งแช่แข็ง HS 0306.17",
        sources: [{ sourceType: "regulation", similarity: 0.92 }],
        processingTimeMs: 150,
      };
      mockApiClient.ragSearch.mockResolvedValue(result);

      const response = await sendMessage({
        type: "RAG_SEARCH",
        payload: { query: "กุ้งแช่แข็ง" },
      });

      expect(response.success).toBe(true);
      expect(response.answer).toBe("กุ้งแช่แข็ง HS 0306.17");
      expect(response.sources).toBeDefined();
    });

    it("returns error on failure", async () => {
      mockApiClient.ragSearch.mockRejectedValue(new Error("RAG error"));

      const response = await sendMessage({
        type: "RAG_SEARCH",
        payload: { query: "test" },
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe("RAG error");
    });

    it("returns QUOTA_EXCEEDED for RAG quota limit", async () => {
      const { QuotaExceededError } = await import("@/lib/api-client");
      const quotaData = {
        error: "QUOTA_EXCEEDED",
        usageType: "chat",
        current: 50,
        limit: 50,
        plan: "FREE",
        message: "Chat quota exceeded",
        upgradeUrl: "https://vollos.ai/pricing",
      };
      mockApiClient.ragSearch.mockRejectedValue(new QuotaExceededError(quotaData));

      const response = await sendMessage({
        type: "RAG_SEARCH",
        payload: { query: "test" },
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe("QUOTA_EXCEEDED");
      expect(response.quotaExceeded).toBeDefined();
    });
  });
});

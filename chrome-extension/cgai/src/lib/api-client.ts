import type { ExtractedLineItem } from "@/types";

export interface ApiConfig {
  baseUrl: string;
  token: string;
  tenantId: string;
}

export interface ScanJobResult {
  jobId: string;
  status: "CREATED" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  s3Key: string;
  items?: ExtractedLineItem[];
}

export interface HsLookupResult {
  code: string;
  descriptionTh: string | null;
  descriptionEn: string | null;
  baseRate: number | null;
  unit: string | null;
  ftaAlerts: FtaAlert[];
  lpiAlerts: LpiAlert[];
  found: boolean;
}

export interface FtaAlert {
  ftaName: string;
  partnerCountry: string;
  formType: string | null;
  preferentialRate: number;
  savingPercent: number;
  conditions: string | null;
  sourceUrl: string | null;
}

export interface LpiAlert {
  hsCode: string;
  controlType: string;
  agencyCode: string;
  agencyNameTh: string;
  agencyNameEn: string;
  requirementTh: string;
  requirementEn: string;
  appliesTo: string;
  sourceUrl: string | null;
}

export interface ExchangeRate {
  currencyCode: string;
  currencyName: string;
  midRate: number;
  effectiveDate: string;
  source: string;
}

export interface RagResult {
  answer: string;
  sources: RagSource[];
  processingTimeMs: number;
}

export interface RagSource {
  sourceType: string;
  sourceId: string;
  chunkText: string;
  contentSummary: string | null;
  similarity: number;
  sourceUrl: string | null;
  docNumber: string | null;
  docType: string | null;
  title: string | null;
}

// Cache TTL: FTA rates change with government announcements
const FTA_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RAG_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const LPI_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const EXCHANGE_RATE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Check if a cached entry is still valid */
export function isCacheValid(cachedAt: string, ttlMs: number): boolean {
  const age = Date.now() - new Date(cachedAt).getTime();
  return age < ttlMs;
}

export { FTA_CACHE_TTL_MS, RAG_CACHE_TTL_MS, LPI_CACHE_TTL_MS, EXCHANGE_RATE_CACHE_TTL_MS };

class ApiClient {
  private config: ApiConfig | null = null;

  async configure(baseUrl: string, token: string, tenantId: string) {
    this.config = { baseUrl, token, tenantId };
    await chrome.storage.session.set({ vollosApiConfig: this.config });
  }

  async loadConfig(): Promise<boolean> {
    const result = await chrome.storage.session.get("vollosApiConfig");
    if (result.vollosApiConfig) {
      this.config = result.vollosApiConfig;
      return true;
    }
    return false;
  }

  isConfigured(): boolean {
    return this.config !== null && !!this.config.token;
  }

  getConfig(): ApiConfig | null {
    return this.config;
  }

  async logout() {
    this.config = null;
    await chrome.storage.session.remove("vollosApiConfig");
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.config) throw new Error("API not configured. Please login first.");

    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
      Authorization: `Bearer ${this.config.token}`,
      "X-Tenant-ID": this.config.tenantId,
    };

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const resp = await fetch(url, { ...options, headers });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`API ${resp.status}: ${text}`);
    }
    return resp.json();
  }

  // Scan PDF via backend
  async scanPdf(pdfBlob: Blob, declarationType: string = "IMPORT"): Promise<ScanJobResult> {
    const form = new FormData();
    form.append("file", pdfBlob, "document.pdf");
    form.append("declarationType", declarationType);
    return this.request("/v1/customsguard/scan", { method: "POST", body: form });
  }

  // Poll job status
  async getJobStatus(jobId: string): Promise<ScanJobResult> {
    return this.request(`/v1/customsguard/scan/${jobId}`);
  }

  // HS batch lookup with FTA alerts
  async hsLookup(codes: string[], originCountry?: string): Promise<HsLookupResult[]> {
    return this.request("/v1/customsguard/hs/lookup", {
      method: "POST",
      body: JSON.stringify({ codes, originCountry }),
    });
  }

  // RAG search (standard request-response)
  async ragSearch(query: string, limit: number = 5): Promise<RagResult> {
    return this.request("/v1/customsguard/rag/search", {
      method: "POST",
      body: JSON.stringify({ query, limit }),
    });
  }

  /**
   * RAG search with SSE streaming.
   * Emits events: "status", "sources", "done", "error"
   */
  ragSearchStream(
    query: string,
    limit: number = 5,
    onStatus: (status: string) => void,
    onSources: (sources: RagSource[]) => void,
    onDone: (data: { answer: string; sources: RagSource[] }) => void,
    onError: (error: string) => void
  ): AbortController {
    if (!this.config) {
      onError("API not configured");
      return new AbortController();
    }

    const controller = new AbortController();
    const url = `${this.config.baseUrl}/v1/customsguard/rag/stream`;

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.token}`,
        "X-Tenant-ID": this.config.tenantId,
      },
      body: JSON.stringify({ query, limit }),
      signal: controller.signal,
    })
      .then(async (resp) => {
        if (!resp.ok || !resp.body) {
          onError(`API error: ${resp.status}`);
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              const eventName = line.slice(6).trim();
              // Next data: line
              const dataLine = lines[lines.indexOf(line) + 1];
              if (dataLine?.startsWith("data:")) {
                const data = JSON.parse(dataLine.slice(5).trim());
                if (eventName === "status") onStatus(data);
                else if (eventName === "sources") onSources(data);
                else if (eventName === "done") onDone(data);
                else if (eventName === "error") onError(data);
              }
            }
          }
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          onError(err.message);
        }
      });

    return controller;
  }

  // Exchange rates
  async getExchangeRates(): Promise<ExchangeRate[]> {
    return this.request("/v1/customsguard/exchange-rates");
  }

  // Semantic HS search
  async semanticSearch(query: string, limit: number = 10) {
    return this.request("/v1/customsguard/hs-codes/semantic", {
      method: "POST",
      body: JSON.stringify({ query, limit }),
    });
  }
}

export const apiClient = new ApiClient();

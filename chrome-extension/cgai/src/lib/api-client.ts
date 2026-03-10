import type { ExtractedLineItem } from "@/types";

export interface ApiConfig {
  baseUrl: string;
  token: string;
  tenantId: string;
}

// --- Quota / Usage types ---

export interface QuotaExceededResponse {
  error: "QUOTA_EXCEEDED";
  usageType: string;
  current: number;
  limit: number;
  plan: string;
  message: string;
  upgradeUrl: string;
}

export interface UsageCounter {
  used: number;
  limit: number;
}

export interface UsageResponse {
  plan: string;
  period: string;
  scan: UsageCounter;
  chat: UsageCounter;
}

export class QuotaExceededError extends Error {
  public readonly quota: QuotaExceededResponse;
  constructor(quota: QuotaExceededResponse) {
    super(quota.message);
    this.name = "QuotaExceededError";
    this.quota = quota;
  }
}

export interface ScanJobResult {
  jobId: string;
  status: "CREATED" | "PROCESSING" | "COMPLETED" | "FAILED" | "NO_ITEMS_FOUND";
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

/** Decode JWT and check if expired (with 30s clock skew buffer) */
export function isTokenExpired(token: string): boolean {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return (payload.exp - 30) < (Date.now() / 1000);
  } catch {
    return true; // corrupt/null token = expired
  }
}

class ApiClient {
  private config: ApiConfig | null = null;
  private onAuthExpiredCallback: (() => void) | null = null;

  /** Register callback for when a 401 is received or token expires */
  setOnAuthExpired(callback: () => void) {
    this.onAuthExpiredCallback = callback;
  }

  /** Get backend URL: devBackendUrl override > env default */
  async getBackendUrl(): Promise<string> {
    const stored = await chrome.storage.local.get("devBackendUrl");
    if (stored.devBackendUrl) return stored.devBackendUrl;
    return import.meta.env.VITE_API_URL;
  }

  async configure(token: string, tenantId: string) {
    const baseUrl = await this.getBackendUrl();
    this.config = { baseUrl, token, tenantId };
    await chrome.storage.session.set({ vollosApiConfig: this.config });
  }

  async loadConfig(): Promise<boolean> {
    const result = await chrome.storage.session.get("vollosApiConfig");
    if (result.vollosApiConfig) {
      const config = result.vollosApiConfig as ApiConfig;
      // Check token expiry before accepting
      if (isTokenExpired(config.token)) {
        await this.logout();
        return false;
      }
      this.config = config;
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

    let resp: Response;
    try {
      resp = await fetch(url, { ...options, headers });
    } catch {
      throw new Error("NETWORK_ERROR");
    }

    if (resp.status === 401) {
      await this.logout();
      this.onAuthExpiredCallback?.();
      throw new Error("SESSION_EXPIRED");
    }

    if (resp.status === 429) {
      try {
        const body = await resp.json();
        if (body?.error === "QUOTA_EXCEEDED") {
          throw new QuotaExceededError(body as QuotaExceededResponse);
        }
      } catch (e) {
        if (e instanceof QuotaExceededError) throw e;
      }
      throw new Error("RATE_LIMITED");
    }

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
        if (resp.status === 401) {
          await this.logout();
          this.onAuthExpiredCallback?.();
          onError("SESSION_EXPIRED");
          return;
        }
        if (resp.status === 429) {
          try {
            const body = await resp.json();
            if (body?.error === "QUOTA_EXCEEDED") {
              onError(JSON.stringify({ quotaExceeded: true, ...body }));
              return;
            }
          } catch { /* ignore parse errors */ }
          onError("RATE_LIMITED");
          return;
        }
        if (!resp.ok || !resp.body) {
          onError(`API error: ${resp.status}`);
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let currentEvent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === "") {
              currentEvent = ""; // Reset on blank line (SSE spec)
              continue;
            }
            if (trimmed.startsWith("event:")) {
              currentEvent = trimmed.slice(6).trim();
            } else if (trimmed.startsWith("data:")) {
              const eventName = currentEvent || "message";
              try {
                const data = JSON.parse(trimmed.slice(5).trim());
                if (eventName === "status") onStatus(data);
                else if (eventName === "sources") onSources(data);
                else if (eventName === "done") onDone(data);
                else if (eventName === "error") onError(data);
              } catch {
                console.warn("[VOLLOS] Malformed SSE JSON, skipping:", trimmed);
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

  // Fetch usage/quota info
  async fetchUsage(): Promise<UsageResponse> {
    return this.request("/v1/usage");
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

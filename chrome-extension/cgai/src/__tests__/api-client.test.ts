import { describe, it, expect, vi, beforeEach } from "vitest";
import { isCacheValid, FTA_CACHE_TTL_MS, RAG_CACHE_TTL_MS } from "@/lib/api-client";

// We need a fresh ApiClient instance per test, so we re-import the module
async function createClient() {
  // Dynamic import to get the class — the module exports a singleton,
  // but we can access the class via the default export pattern.
  // Since ApiClient is not exported as a named export, we'll create
  // instances by importing the module and using the singleton + logout to reset.
  const mod = await import("@/lib/api-client");
  // Reset the singleton
  await mod.apiClient.logout();
  return mod.apiClient;
}

// ── isCacheValid ──

describe("isCacheValid", () => {
  it("returns true for fresh cache (1 min ago, 24h TTL)", () => {
    const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
    expect(isCacheValid(oneMinAgo, FTA_CACHE_TTL_MS)).toBe(true);
  });

  it("returns false for expired cache (25h ago, 24h TTL)", () => {
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 3600_000).toISOString();
    expect(isCacheValid(twentyFiveHoursAgo, FTA_CACHE_TTL_MS)).toBe(false);
  });

  it("returns false at exactly the TTL boundary", () => {
    const exactlyAtTTL = new Date(Date.now() - RAG_CACHE_TTL_MS).toISOString();
    expect(isCacheValid(exactlyAtTTL, RAG_CACHE_TTL_MS)).toBe(false);
  });

  it("returns false for very old cache", () => {
    const veryOld = new Date(Date.now() - 365 * 24 * 3600_000).toISOString();
    expect(isCacheValid(veryOld, FTA_CACHE_TTL_MS)).toBe(false);
  });
});

// ── ApiClient ──

describe("ApiClient", () => {
  let client: Awaited<ReturnType<typeof createClient>>;

  beforeEach(async () => {
    client = await createClient();
  });

  it("isConfigured() returns false initially", () => {
    expect(client.isConfigured()).toBe(false);
  });

  it("configure() stores config and calls chrome.storage.session.set", async () => {
    await client.configure("http://localhost:8080", "tok123", "tenant-1");
    expect(chrome.storage.session.set).toHaveBeenCalledWith({
      vollosApiConfig: {
        baseUrl: "http://localhost:8080",
        token: "tok123",
        tenantId: "tenant-1",
      },
    });
  });

  it("isConfigured() returns true after configure()", async () => {
    await client.configure("http://localhost:8080", "tok123", "tenant-1");
    expect(client.isConfigured()).toBe(true);
  });

  it("getConfig() returns config after configure()", async () => {
    await client.configure("http://localhost:8080", "tok123", "tenant-1");
    expect(client.getConfig()).toEqual({
      baseUrl: "http://localhost:8080",
      token: "tok123",
      tenantId: "tenant-1",
    });
  });

  it("logout() resets isConfigured() to false", async () => {
    await client.configure("http://localhost:8080", "tok123", "tenant-1");
    await client.logout();
    expect(client.isConfigured()).toBe(false);
  });

  it("request() throws when not configured", async () => {
    await expect(client.hsLookup(["0306.17"])).rejects.toThrow(
      "API not configured"
    );
  });

  it("request() sets correct headers (Authorization, X-Tenant-ID, Content-Type)", async () => {
    await client.configure("http://localhost:8080", "tok123", "tenant-1");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    globalThis.fetch = mockFetch;

    await client.hsLookup(["0306.17"]);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("http://localhost:8080/v1/customsguard/hs/lookup");
    expect(options.headers).toMatchObject({
      Authorization: "Bearer tok123",
      "X-Tenant-ID": "tenant-1",
      "Content-Type": "application/json",
    });
  });

  it("scanPdf() sends FormData without Content-Type header", async () => {
    await client.configure("http://localhost:8080", "tok123", "tenant-1");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jobId: "j1", status: "CREATED", progress: 0, s3Key: "k" }),
    });
    globalThis.fetch = mockFetch;

    const blob = new Blob(["fake-pdf"], { type: "application/pdf" });
    await client.scanPdf(blob);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.body).toBeInstanceOf(FormData);
    // FormData requests should NOT have Content-Type (browser sets boundary)
    expect(options.headers["Content-Type"]).toBeUndefined();
  });
});

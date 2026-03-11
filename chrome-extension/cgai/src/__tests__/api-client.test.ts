import { describe, it, expect, vi, beforeEach } from "vitest";
import { isCacheValid, isTokenExpired, FTA_CACHE_TTL_MS, RAG_CACHE_TTL_MS } from "@/lib/api-client";

// We need a fresh ApiClient instance per test, so we re-import the module
async function createClient() {
  const mod = await import("@/lib/api-client");
  await mod.apiClient.logout();
  return mod.apiClient;
}

// Helper: create a fake JWT with given exp
function fakeJwt(exp: number): string {
  const header = btoa(JSON.stringify({ alg: "HS256" }));
  const payload = btoa(JSON.stringify({ sub: "user", exp }));
  return `${header}.${payload}.fakesig`;
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

// ── isTokenExpired ──

describe("isTokenExpired", () => {
  it("returns false for token expiring in 1 hour", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    expect(isTokenExpired(fakeJwt(exp))).toBe(false);
  });

  it("returns true for token that expired 1 minute ago", () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    expect(isTokenExpired(fakeJwt(exp))).toBe(true);
  });

  it("returns true within 30s clock skew buffer", () => {
    // Token expires in 20s, but with 30s buffer it's considered expired
    const exp = Math.floor(Date.now() / 1000) + 20;
    expect(isTokenExpired(fakeJwt(exp))).toBe(true);
  });

  it("returns true for corrupt token", () => {
    expect(isTokenExpired("not.a.jwt")).toBe(true);
  });

  it("returns true for empty string", () => {
    expect(isTokenExpired("")).toBe(true);
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
    await client.configure("tok123", "tenant-1");
    expect(chrome.storage.session.set).toHaveBeenCalled();
    const setCall = vi.mocked(chrome.storage.session.set).mock.calls[0][0] as Record<string, unknown>;
    const config = setCall.vollosApiConfig as { token: string; tenantId: string };
    expect(config.token).toBe("tok123");
    expect(config.tenantId).toBe("tenant-1");
  });

  it("isConfigured() returns true after configure()", async () => {
    await client.configure("tok123", "tenant-1");
    expect(client.isConfigured()).toBe(true);
  });

  it("getConfig() returns config after configure()", async () => {
    await client.configure("tok123", "tenant-1");
    const config = client.getConfig();
    expect(config?.token).toBe("tok123");
    expect(config?.tenantId).toBe("tenant-1");
  });

  it("logout() resets isConfigured() to false", async () => {
    await client.configure("tok123", "tenant-1");
    await client.logout();
    expect(client.isConfigured()).toBe(false);
  });

  it("request() throws when not configured", async () => {
    await expect(client.hsLookup(["0306.17"])).rejects.toThrow(
      "API not configured"
    );
  });

  it("request() sets correct headers (Authorization, X-Tenant-ID, Content-Type)", async () => {
    await client.configure("tok123", "tenant-1");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });
    globalThis.fetch = mockFetch;

    await client.hsLookup(["0306.17"]);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers).toMatchObject({
      Authorization: "Bearer tok123",
      "X-Tenant-ID": "tenant-1",
      "Content-Type": "application/json",
    });
  });

  it("scanPdf() sends FormData without Content-Type header", async () => {
    await client.configure("tok123", "tenant-1");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ jobId: "j1", status: "CREATED", progress: 0, s3Key: "k" }),
    });
    globalThis.fetch = mockFetch;

    const blob = new Blob(["fake-pdf"], { type: "application/pdf" });
    await client.scanPdf(blob);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.headers["Content-Type"]).toBeUndefined();
  });

  it("401 response triggers onAuthExpired callback", async () => {
    await client.configure("tok123", "tenant-1");

    const authExpiredFn = vi.fn();
    client.setOnAuthExpired(authExpiredFn);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });
    globalThis.fetch = mockFetch;

    await expect(client.hsLookup(["0306.17"])).rejects.toThrow("SESSION_EXPIRED");
    expect(authExpiredFn).toHaveBeenCalledOnce();
    expect(client.isConfigured()).toBe(false);
  });

  it("loadConfig() rejects expired token", async () => {
    // Store a config with expired token in session storage
    const expiredToken = fakeJwt(Math.floor(Date.now() / 1000) - 3600);
    await chrome.storage.session.set({
      vollosApiConfig: {
        baseUrl: "http://localhost:8080",
        token: expiredToken,
        tenantId: "t1",
      },
    });

    const loaded = await client.loadConfig();
    expect(loaded).toBe(false);
    expect(client.isConfigured()).toBe(false);
  });
});

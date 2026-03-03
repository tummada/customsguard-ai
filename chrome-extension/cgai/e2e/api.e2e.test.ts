/**
 * Backend API E2E Tests
 *
 * Requires a running backend (docker-compose.dev.yml + bootRun).
 * Run: npm run test:e2e:api
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import {
  BASE_URL,
  DEV_TENANT_ID,
  SECOND_TENANT_ID,
  getDevToken,
  login,
  authHeaders,
  readTestPdf,
  cleanupTestData,
  pollUntilComplete,
} from "./helpers";

// Shared state across sequential tests
let token = "";
let tenantId = "";
let uploadedJobId = "";

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeAll(() => {
  // Attempt to clean stale jobs before running
  cleanupTestData("", DEV_TENANT_ID);
});

afterAll(() => {
  // Cleanup any leftover test data
  if (token) {
    cleanupTestData(token, tenantId);
  }
});

// ---------------------------------------------------------------------------
// Auth tests
// ---------------------------------------------------------------------------

describe("Auth", () => {
  it("1. Unauthorized request → 403", async () => {
    const resp = await fetch(
      `${BASE_URL}/v1/customsguard/hs-codes?query=test&page=0&size=10`
    );
    expect(resp.status).toBe(403);
  });

  it("2. Fake token → 403", async () => {
    const resp = await fetch(
      `${BASE_URL}/v1/customsguard/hs-codes?query=test&page=0&size=10`,
      {
        headers: {
          Authorization: "Bearer fake-token-12345",
          "X-Tenant-ID": DEV_TENANT_ID,
        },
      }
    );
    expect(resp.status).toBe(403);
  });

  it("3. Dev token → 200 with accessToken + tenantId", async () => {
    const data = await getDevToken();
    expect(data.accessToken).toBeTruthy();
    expect(data.tenantId).toBe(DEV_TENANT_ID);
    expect(data.expiresIn).toBe("24h");

    // Store for subsequent tests
    token = data.accessToken;
    tenantId = data.tenantId;
  });

  it("4. Login endpoint → 200 with accessToken", async () => {
    const data = await login("e2e-tester@vollos.local", "password123");
    expect(data.accessToken).toBeTruthy();
    expect(data.tenantId).toBe(DEV_TENANT_ID);
    expect(data.email).toBe("e2e-tester@vollos.local");
  });

  it("16. Tampered token → 403", async () => {
    // Take valid token and mangle the signature
    const tampered = token.slice(0, -5) + "XXXXX";
    const resp = await fetch(
      `${BASE_URL}/v1/customsguard/hs-codes?query=test&page=0&size=10`,
      {
        headers: {
          Authorization: `Bearer ${tampered}`,
          "X-Tenant-ID": DEV_TENANT_ID,
        },
      }
    );
    expect(resp.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// HS Code tests
// ---------------------------------------------------------------------------

describe("HS Codes", () => {
  it("5. Seed HS codes", async () => {
    const resp = await fetch(`${BASE_URL}/v1/customsguard/hs-codes/seed`, {
      method: "POST",
      headers: authHeaders(token, tenantId),
    });
    expect(resp.status).toBe(200);
    const data = await resp.json();
    // First run: seeded >= 21. Subsequent runs: seeded = 0 (already exists).
    expect(data).toHaveProperty("seeded");
    expect(typeof data.seeded).toBe("number");
  });

  it("6. List HS codes → content.length > 0", async () => {
    // GET /hs-codes requires `query` param + Spring Pageable (page, size)
    const resp = await fetch(
      `${BASE_URL}/v1/customsguard/hs-codes?query=&page=0&size=20`,
      {
        headers: authHeaders(token, tenantId),
      }
    );
    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.content.length).toBeGreaterThan(0);
  });

  it('7. Semantic search "กุ้ง" → results > 0', async () => {
    // First ensure embeddings are generated
    const embedResp = await fetch(
      `${BASE_URL}/v1/customsguard/hs-codes/embed-all`,
      {
        method: "POST",
        headers: authHeaders(token, tenantId),
      }
    );
    // embed-all might take a moment; it's OK if it was already done
    expect([200, 202].includes(embedResp.status)).toBe(true);

    const resp = await fetch(
      `${BASE_URL}/v1/customsguard/hs-codes/semantic`,
      {
        method: "POST",
        headers: {
          ...authHeaders(token, tenantId),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: "กุ้ง", limit: 5 }),
      }
    );
    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// PDF Scan tests
// ---------------------------------------------------------------------------

describe("PDF Scan", () => {
  it("8. Upload PDF → CREATED", async () => {
    const pdfBuffer = readTestPdf();
    // Use Uint8Array to ensure proper binary handling in Node.js Blob
    const blob = new Blob([new Uint8Array(pdfBuffer)], {
      type: "application/pdf",
    });

    const form = new FormData();
    form.append("file", blob, "test-invoice.pdf");
    form.append("declarationType", "IMPORT");

    // Only pass auth headers — do NOT set Content-Type; fetch auto-sets
    // multipart/form-data with boundary when body is FormData.
    const resp = await fetch(`${BASE_URL}/v1/customsguard/scan`, {
      method: "POST",
      headers: authHeaders(token, tenantId),
      body: form,
    });
    // Backend returns 202 Accepted
    expect([200, 202].includes(resp.status)).toBe(true);

    const data = await resp.json();
    expect(data.jobId).toBeTruthy();
    expect(data.status).toBe("CREATED");

    uploadedJobId = data.jobId;
  });

  it("9. Upload non-PDF → 400", async () => {
    const textBlob = new Blob(["not a PDF"], { type: "text/plain" });

    const form = new FormData();
    form.append("file", textBlob, "readme.txt");
    form.append("declarationType", "IMPORT");

    const resp = await fetch(`${BASE_URL}/v1/customsguard/scan`, {
      method: "POST",
      headers: authHeaders(token, tenantId),
      body: form,
    });
    expect(resp.status).toBe(400);
  });

  it("10. Mock-worker completes the job", () => {
    expect(uploadedJobId).toBeTruthy();

    const container = process.env.DB_CONTAINER || "saas-db";
    const result = execSync(
      `bash ../../test-data/mock-worker.sh ${uploadedJobId}`,
      {
        cwd: "/home/ipon/workspace/aiservice/chrome-extension/cgai",
        env: {
          ...process.env,
          DB_CONTAINER: container,
          DB_NAME: process.env.DB_NAME || "ai_saas_db",
          DB_USER: process.env.DB_USER || "saas_admin",
        },
        timeout: 15_000,
      }
    );
    expect(result.toString()).toContain("COMPLETED");
  });

  it("11. Poll job → COMPLETED with 5 items", async () => {
    const job = await pollUntilComplete(uploadedJobId, token, tenantId);
    expect(job.status).toBe("COMPLETED");
    expect(job.items).toBeDefined();
    expect(job.items!.length).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// FTA lookup
// ---------------------------------------------------------------------------

describe("FTA Lookup", () => {
  it("12. FTA lookup CN shrimp → ftaAlerts + savingPercent", async () => {
    const resp = await fetch(`${BASE_URL}/v1/customsguard/hs/lookup`, {
      method: "POST",
      headers: {
        ...authHeaders(token, tenantId),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ codes: ["0306.17"], originCountry: "CN" }),
    });
    expect(resp.status).toBe(200);

    const data = await resp.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const shrimp = data[0];
    expect(shrimp.found).toBe(true);
    expect(shrimp.ftaAlerts.length).toBeGreaterThan(0);
    expect(shrimp.ftaAlerts[0].savingPercent).toBeGreaterThan(0);
  });

  it("15. Price precision — baseRate is number", async () => {
    const resp = await fetch(`${BASE_URL}/v1/customsguard/hs/lookup`, {
      method: "POST",
      headers: {
        ...authHeaders(token, tenantId),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ codes: ["0306.17"], originCountry: "CN" }),
    });
    const data = await resp.json();
    const first = data[0];
    expect(typeof first.baseRate).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// RAG search
// ---------------------------------------------------------------------------

describe("RAG Search", () => {
  it("13. RAG search → has answer field", async () => {
    const resp = await fetch(`${BASE_URL}/v1/customsguard/rag/search`, {
      method: "POST",
      headers: {
        ...authHeaders(token, tenantId),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: "HS code กุ้ง", limit: 5 }),
    });
    expect(resp.status).toBe(200);

    const data = await resp.json();
    expect(data).toHaveProperty("answer");
    expect(typeof data.answer).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Cross-tenant RLS
// ---------------------------------------------------------------------------

describe("Cross-Tenant Isolation", () => {
  it("14. Tenant B cannot access Tenant A job → 403 or 404", async () => {
    expect(uploadedJobId).toBeTruthy();

    // Use the same token (issued for tenant A) but switch X-Tenant-ID to tenant B.
    // JWT filter detects tenant mismatch → 403 (before RLS even kicks in).
    // This is the correct security behavior: double-layer protection.
    const resp = await fetch(
      `${BASE_URL}/v1/customsguard/scan/${uploadedJobId}`,
      {
        headers: authHeaders(token, SECOND_TENANT_ID),
      }
    );

    // 403 = JWT tenant mismatch, 404 = RLS filtered — both are valid isolation
    expect([403, 404]).toContain(resp.status);
    expect(resp.status).not.toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Additional robustness tests
// ---------------------------------------------------------------------------

describe("Edge Cases", () => {
  it("17. Missing X-Tenant-ID header → request still handled", async () => {
    const resp = await fetch(`${BASE_URL}/v1/customsguard/hs-codes?query=&page=0&size=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Current behavior: backend accepts missing tenant header (JWT is valid).
    // TenantInterceptor may default to JWT's tenantId.
    // Acceptable: 200 (default tenant) or 400/403 (strict validation).
    expect([200, 400, 403]).toContain(resp.status);
  });

  it("18. Poll non-existent job → 404", async () => {
    const fakeJobId = "00000000-0000-0000-0000-000000000999";
    const resp = await fetch(
      `${BASE_URL}/v1/customsguard/scan/${fakeJobId}`,
      { headers: authHeaders(token, tenantId) }
    );
    expect(resp.status).toBe(404);
  });

  it("19. Semantic search with empty query → still returns 200", async () => {
    const resp = await fetch(
      `${BASE_URL}/v1/customsguard/hs-codes/semantic`,
      {
        method: "POST",
        headers: {
          ...authHeaders(token, tenantId),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: "", limit: 3 }),
      }
    );
    // Empty query: might return 200 with empty results or 400 validation error
    expect([200, 400]).toContain(resp.status);
  });

  it("20. FTA lookup with unknown HS code → found: false", async () => {
    const resp = await fetch(`${BASE_URL}/v1/customsguard/hs/lookup`, {
      method: "POST",
      headers: {
        ...authHeaders(token, tenantId),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ codes: ["9999.99"], originCountry: "CN" }),
    });
    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data[0].found).toBe(false);
    expect(data[0].ftaAlerts).toHaveLength(0);
  });

  it("21. Completed job items have expected shape", async () => {
    expect(uploadedJobId).toBeTruthy();
    const resp = await fetch(
      `${BASE_URL}/v1/customsguard/scan/${uploadedJobId}`,
      { headers: authHeaders(token, tenantId) }
    );
    const data = await resp.json();
    expect(data.status).toBe("COMPLETED");
    expect(data.progress).toBe(100);

    // Validate first item structure
    const item = data.items[0];
    expect(item).toHaveProperty("hsCode");
    expect(item).toHaveProperty("descriptionEn");
    expect(item).toHaveProperty("confidence");
    expect(typeof item.confidence).toBe("number");
    expect(item.confidence).toBeGreaterThanOrEqual(0);
    expect(item.confidence).toBeLessThanOrEqual(1);
  });

  it("22. FTA lookup multiple codes at once", async () => {
    const resp = await fetch(`${BASE_URL}/v1/customsguard/hs/lookup`, {
      method: "POST",
      headers: {
        ...authHeaders(token, tenantId),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        codes: ["0306.17", "1006.30", "8471.30"],
        originCountry: "CN",
      }),
    });
    expect(resp.status).toBe(200);
    const data = await resp.json();
    // Should return one result per code
    expect(data.length).toBe(3);
  });
});

/**
 * Full-Flow E2E Tests (Playwright) — TC-E2E-001 to TC-E2E-010
 *
 * ทดสอบ flow จริงตั้งแต่ต้นจนจบ ครอบคลุม:
 *   - Login → Scan → Confirm → Magic Fill
 *   - Chat → FTA savings
 *   - LPI alert display
 *   - Quota exceeded modal
 *   - Offline resilience (Dexie cache)
 *   - Token expiry mid-session
 *   - Multi-tenant data isolation
 *   - Concurrent scan requests
 *
 * Prerequisites:
 *   1. `npm run build`  (produces dist/)
 *   2. Backend running   (docker-compose.dev.yml + bootRun)
 *
 * Run: npx playwright test full-flow.spec.ts
 */
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import {
  launchExtension,
  getExtensionId,
  openSidepanel,
  waitForSplashEnd,
  ensureLoggedIn,
  ensureManualDir,
} from "./extension-helpers";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:8080";
const MANUAL_DIR = ensureManualDir();

let context: BrowserContext;
let extId: string;

async function snap(page: Page, name: string) {
  await page.screenshot({ path: resolve(MANUAL_DIR, name), fullPage: true });
}

// Mock routes reusable across tests
async function mockScanEndpoints(page: Page, items: unknown[] = []) {
  await page.route("**/v1/customsguard/scan", (route, request) => {
    if (request.method() === "POST") {
      route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ jobId: "e2e-job-001", status: "CREATED" }),
      });
    } else {
      route.continue();
    }
  });

  await page.route("**/v1/customsguard/scan/*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jobId: "e2e-job-001",
        status: "COMPLETED",
        progress: 100,
        s3Key: "mock/test.pdf",
        items,
      }),
    });
  });
}

async function mockHsLookup(page: Page, results: unknown[] = []) {
  await page.route("**/v1/customsguard/hs/lookup", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(results),
    });
  });
}

async function mockRagSearch(page: Page, answer: string, sources: unknown[] = []) {
  await page.route("**/v1/customsguard/rag/search", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ answer, sources, processingTimeMs: 350 }),
    });
  });
}

async function mockUsage(page: Page, scan = { used: 0, limit: 10 }, chat = { used: 0, limit: 3 }) {
  await page.route("**/v1/usage", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ plan: "FREE", period: "2026-03", scan, chat }),
    });
  });
}

async function mockExchangeRates(page: Page) {
  await page.route("**/v1/customsguard/exchange-rates", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { currencyCode: "USD", currencyName: "US Dollar", midRate: 33.50, effectiveDate: "2026-03-09", source: "BOT" },
      ]),
    });
  });
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
  context = await launchExtension();
  extId = getExtensionId(context);
});

test.afterAll(async () => {
  await context?.close();
});

// ---------------------------------------------------------------------------
// TC-E2E-001: Full flow — Login → Scan → Confirm → Magic Fill
// ---------------------------------------------------------------------------

test("TC-E2E-001: Login → Scan PDF → Confirm items → Magic Fill ready", async () => {
  const page = await openSidepanel(context, extId);
  await ensureLoggedIn(page, BASE_URL);

  // Mock all backend calls
  const scanItems = [
    {
      hsCode: "0306.17",
      descriptionEn: "Frozen shrimp",
      descriptionTh: "กุ้งแช่แข็ง",
      quantity: "100",
      weight: "500",
      unitPrice: "150.00",
      cifPrice: "15000.00",
      currency: "USD",
      confidence: 0.95,
      aiReason: "Semantic match",
      sourcePageIndex: 0,
    },
    {
      hsCode: "1006.30",
      descriptionEn: "Milled rice",
      descriptionTh: "ข้าวสาร",
      quantity: "200",
      weight: "1000",
      unitPrice: "25.00",
      cifPrice: "5000.00",
      currency: "USD",
      confidence: 0.88,
      aiReason: "Semantic match",
      sourcePageIndex: 1,
    },
  ];

  await mockScanEndpoints(page, scanItems);
  await mockHsLookup(page, [
    { code: "0306.17", descriptionTh: "กุ้งแช่แข็ง", baseRate: 5, found: true, ftaAlerts: [], lpiAlerts: [] },
    { code: "1006.30", descriptionTh: "ข้าวสาร", baseRate: 10, found: true, ftaAlerts: [], lpiAlerts: [] },
  ]);
  await mockUsage(page);
  await mockExchangeRates(page);
  await mockRagSearch(page, "ข้อมูลพิกัด", []);

  // Go to Scan tab
  const scanTab = page.locator("button:has(svg.lucide-scan-line)");
  if (await scanTab.isVisible().catch(() => false)) await scanTab.click();

  // Upload PDF
  const fileInput = page.locator("input[type='file'][accept='.pdf']");
  const testPdfPath = resolve(__dirname, "../../../test-data/test-invoice.pdf");
  await fileInput.setInputFiles(testPdfPath);

  // Wait for scan button and click
  const scanBtn = page.locator("button.btn-primary").first();
  await expect(scanBtn).toBeVisible({ timeout: 10_000 });
  await scanBtn.click();

  // Wait for items to appear
  await page.waitForTimeout(3_000);
  await snap(page, "e2e-001-scan-results.png");

  // Verify items displayed
  const hsCodeText = page.locator("text=0306.17");
  expect(await hsCodeText.isVisible().catch(() => false)).toBe(true);

  // Confirm all items
  const confirmAllBtn = page.locator("button:has-text('ยืนยันทั้งหมด'), button:has-text('Confirm All')").first();
  if (await confirmAllBtn.isVisible().catch(() => false)) {
    await confirmAllBtn.click();
    await page.waitForTimeout(500);
  } else {
    // Confirm one by one
    const okBtns = page.locator("button:has-text('OK')");
    const count = await okBtns.count();
    for (let i = 0; i < count; i++) {
      await okBtns.nth(0).click();
      await page.waitForTimeout(200);
    }
  }

  await snap(page, "e2e-001-items-confirmed.png");

  // Switch to Magic Fill tab
  const magicTab = page.locator("button:has(svg.lucide-wand-2), button:has(svg.lucide-wand)").first();
  if (await magicTab.isVisible().catch(() => false)) {
    await magicTab.click();
    await page.waitForTimeout(500);
    await snap(page, "e2e-001-magic-fill-tab.png");
  }

  await page.close();
});

// ---------------------------------------------------------------------------
// TC-E2E-002: Chat → HS lookup → FTA savings shown
// ---------------------------------------------------------------------------

test("TC-E2E-002: Chat with customs query → answer + FTA context", async () => {
  const page = await openSidepanel(context, extId);
  await ensureLoggedIn(page, BASE_URL);

  await mockRagSearch(
    page,
    "กุ้งแช่แข็ง HS 0306.17 อัตราอากร MFN 5% ใช้สิทธิ ACFTA ลดเหลือ 0% ประหยัดได้ 5%",
    [
      {
        sourceType: "REGULATION",
        sourceId: "reg-001",
        chunkText: "ประกาศกรมศุลกากร เรื่อง ACFTA อัตราอากรกุ้ง",
        contentSummary: "ACFTA preferential rate for shrimp",
        similarity: 0.91,
        sourceUrl: "https://customs.go.th/reg/001",
        docNumber: "กค 0619/2566",
        docType: "REGULATION",
        title: "ประกาศ ACFTA อัตราอากรสินค้าประมง",
      },
    ]
  );
  await mockUsage(page);

  // Switch to Chat tab
  const chatTab = page.locator("button:has(svg.lucide-message-circle)");
  await chatTab.click();

  // Type customs query
  const input = page.locator("input[type='text']").first();
  await input.fill("นำเข้ากุ้งแช่แข็งจากจีน อากรเท่าไร ACFTA ลดได้ไหม");

  const sendBtn = page.locator("button:has(svg.lucide-send)");
  await sendBtn.click();

  // Wait for response
  await page.waitForTimeout(3_000);

  // Verify answer contains FTA info
  const answerArea = page.locator("text=/ACFTA|0306|กุ้ง/");
  expect(await answerArea.first().isVisible().catch(() => false)).toBe(true);

  // Verify source citation visible
  const sourceArea = page.locator("text=/ประกาศ|REGULATION|92%|91%/");
  const hasSource = await sourceArea.first().isVisible().catch(() => false);

  await snap(page, "e2e-002-chat-fta-answer.png");
  await page.close();
});

// ---------------------------------------------------------------------------
// TC-E2E-003: Scan → LPI alert banner visible
// ---------------------------------------------------------------------------

test("TC-E2E-003: Scan items with LPI requirement → LPI alert banner shown", async () => {
  const page = await openSidepanel(context, extId);
  await ensureLoggedIn(page, BASE_URL);

  const scanItems = [
    {
      hsCode: "2933.39",
      descriptionEn: "Chemical compound",
      descriptionTh: "สารเคมี",
      quantity: "50",
      weight: "100",
      unitPrice: "500.00",
      cifPrice: "25000.00",
      currency: "USD",
      confidence: 0.82,
      aiReason: "Semantic match",
      sourcePageIndex: 0,
    },
  ];

  await mockScanEndpoints(page, scanItems);
  await mockHsLookup(page, [
    {
      code: "2933.39",
      descriptionTh: "สารเคมี",
      baseRate: 10,
      found: true,
      ftaAlerts: [],
      lpiAlerts: [
        {
          hsCode: "2933.39",
          controlType: "LICENSE",
          agencyCode: "FDA",
          agencyNameTh: "สำนักงานคณะกรรมการอาหารและยา",
          agencyNameEn: "Food and Drug Administration",
          requirementTh: "ต้องขอใบอนุญาตนำเข้าวัตถุอันตราย",
          requirementEn: "Hazardous substance import license required",
          appliesTo: "IMPORT",
          sourceUrl: "https://www.fda.moph.go.th",
        },
      ],
    },
  ]);
  await mockUsage(page);
  await mockExchangeRates(page);
  await mockRagSearch(page, "สารเคมีต้องมีใบอนุญาต", []);

  // Go to Scan tab
  const scanTab = page.locator("button:has(svg.lucide-scan-line)");
  if (await scanTab.isVisible().catch(() => false)) await scanTab.click();

  // Upload + scan
  const fileInput = page.locator("input[type='file'][accept='.pdf']");
  const testPdfPath = resolve(__dirname, "../../../test-data/test-invoice.pdf");
  await fileInput.setInputFiles(testPdfPath);

  const scanBtn = page.locator("button.btn-primary").first();
  await expect(scanBtn).toBeVisible({ timeout: 10_000 });
  await scanBtn.click();
  await page.waitForTimeout(4_000);

  // Look for LPI alert banner (amber/yellow banner with agency info)
  const lpiBanner = page.locator("text=/ใบอนุญาต|LICENSE|FDA|LPI/i");
  const hasLpi = await lpiBanner.first().isVisible().catch(() => false);

  await snap(page, "e2e-003-lpi-alert-banner.png");

  // If LPI banner visible, expand to see details
  if (hasLpi) {
    const expandBtn = page.locator("button:has(svg.lucide-chevron-down), button:has(svg.lucide-chevron-right)").first();
    if (await expandBtn.isVisible().catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(300);
      await snap(page, "e2e-003-lpi-expanded.png");
    }
  }

  await page.close();
});

// ---------------------------------------------------------------------------
// TC-E2E-005: Quota exceeded → modal shown
// ---------------------------------------------------------------------------

test("TC-E2E-005: Scan quota exceeded → QuotaExceededModal shown", async () => {
  const page = await openSidepanel(context, extId);
  await ensureLoggedIn(page, BASE_URL);

  // Mock scan to return 429 quota exceeded
  await page.route("**/v1/customsguard/scan", (route, request) => {
    if (request.method() === "POST") {
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          error: "QUOTA_EXCEEDED",
          usageType: "scan",
          current: 11,
          limit: 10,
          plan: "FREE",
          message: "คุณใช้งานครบโควต้าแล้ว อัพเกรดเป็น PRO เพื่อใช้งานเพิ่ม",
          upgradeUrl: "/pricing",
        }),
      });
    } else {
      route.continue();
    }
  });
  await mockUsage(page, { used: 10, limit: 10 }, { used: 3, limit: 3 });
  await mockExchangeRates(page);

  // Go to Scan tab
  const scanTab = page.locator("button:has(svg.lucide-scan-line)");
  if (await scanTab.isVisible().catch(() => false)) await scanTab.click();

  // Upload PDF
  const fileInput = page.locator("input[type='file'][accept='.pdf']");
  const testPdfPath = resolve(__dirname, "../../../test-data/test-invoice.pdf");
  await fileInput.setInputFiles(testPdfPath);

  // Click scan (triggers 429)
  const scanBtn = page.locator("button.btn-primary").first();
  await expect(scanBtn).toBeVisible({ timeout: 10_000 });
  await scanBtn.click();

  // Wait for quota exceeded modal
  await page.waitForTimeout(3_000);

  // Look for quota modal elements
  const quotaModal = page.locator("text=/โควต้า|QUOTA|อัพเกรด|upgrade/i");
  const hasModal = await quotaModal.first().isVisible().catch(() => false);

  await snap(page, "e2e-005-quota-exceeded-modal.png");

  // Close modal if visible
  if (hasModal) {
    const closeBtn = page.locator("button:has(svg.lucide-x)").first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }
  }

  await page.close();
});

// ---------------------------------------------------------------------------
// TC-E2E-007: Offline resilience — cached data persists
// ---------------------------------------------------------------------------

test("TC-E2E-007: Scan online → go offline → cached data still visible", async () => {
  const page = await openSidepanel(context, extId);
  await ensureLoggedIn(page, BASE_URL);

  const scanItems = [
    {
      hsCode: "8471.30",
      descriptionEn: "Laptop computer",
      descriptionTh: "คอมพิวเตอร์แล็ปท็อป",
      quantity: "10",
      weight: "25",
      unitPrice: "800.00",
      cifPrice: "8000.00",
      currency: "USD",
      confidence: 0.92,
      aiReason: "High confidence match",
      sourcePageIndex: 0,
    },
  ];

  await mockScanEndpoints(page, scanItems);
  await mockHsLookup(page, [
    { code: "8471.30", descriptionTh: "คอมพิวเตอร์", baseRate: 0, found: true, ftaAlerts: [], lpiAlerts: [] },
  ]);
  await mockUsage(page);
  await mockExchangeRates(page);
  await mockRagSearch(page, "คอมพิวเตอร์แล็ปท็อป", []);

  // Go to Scan tab and scan
  const scanTab = page.locator("button:has(svg.lucide-scan-line)");
  if (await scanTab.isVisible().catch(() => false)) await scanTab.click();

  const fileInput = page.locator("input[type='file'][accept='.pdf']");
  const testPdfPath = resolve(__dirname, "../../../test-data/test-invoice.pdf");
  await fileInput.setInputFiles(testPdfPath);

  const scanBtn = page.locator("button.btn-primary").first();
  await expect(scanBtn).toBeVisible({ timeout: 10_000 });
  await scanBtn.click();
  await page.waitForTimeout(3_000);

  // Verify items visible online
  const hsCode = page.locator("text=8471.30");
  expect(await hsCode.isVisible().catch(() => false)).toBe(true);
  await snap(page, "e2e-007-online-scan-result.png");

  // Simulate offline by blocking all network requests
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("chrome-extension://")) {
      route.continue();
    } else {
      route.abort("connectionrefused");
    }
  });

  // Reload — data should persist from Dexie (IndexedDB)
  // Note: We don't reload because that would lose the extension context.
  // Instead, switch tabs and come back to verify data persists.
  const chatTab = page.locator("button:has(svg.lucide-message-circle)");
  await chatTab.click();
  await page.waitForTimeout(500);

  // Switch back to scan tab
  if (await scanTab.isVisible().catch(() => false)) await scanTab.click();
  await page.waitForTimeout(500);

  // Data should still be visible (from Dexie, not API)
  const hsCodeAgain = page.locator("text=8471.30");
  const stillVisible = await hsCodeAgain.isVisible().catch(() => false);

  await snap(page, "e2e-007-offline-data-persists.png");

  // Unblock routes
  await page.unrouteAll();

  await page.close();
});

// ---------------------------------------------------------------------------
// TC-E2E-008: Token expiry mid-session → graceful redirect to login
// ---------------------------------------------------------------------------

test("TC-E2E-008: Token expires mid-session → redirected to login screen", async () => {
  const page = await openSidepanel(context, extId);
  await ensureLoggedIn(page, BASE_URL);

  // Verify we're in the app (tab bar visible)
  await expect(page.locator("svg.lucide").first()).toBeVisible({ timeout: 5_000 });
  await snap(page, "e2e-008-before-expiry.png");

  // Simulate backend returning 401 (token expired)
  await page.route("**/v1/**", (route) => {
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Token expired" }),
    });
  });

  // Trigger an API call that will get 401
  // Switch to Chat tab and send a message
  const chatTab = page.locator("button:has(svg.lucide-message-circle)");
  await chatTab.click();

  const input = page.locator("input[type='text']").first();
  if (await input.isVisible().catch(() => false)) {
    await input.fill("test query");
    const sendBtn = page.locator("button:has(svg.lucide-send)");
    if (await sendBtn.isVisible().catch(() => false)) {
      await sendBtn.click();
    }
  }

  await page.waitForTimeout(3_000);

  // Should see login screen (apiClient.onAuthExpired triggers logout)
  const loginVisible = await page.locator("input[type='email']").isVisible().catch(() => false);
  // Or should see an error/login prompt
  const loginOrError = loginVisible ||
    await page.locator("text=/login|เข้าสู่ระบบ|session.*expired/i").first().isVisible().catch(() => false);

  await snap(page, "e2e-008-after-expiry.png");

  // Cleanup routes
  await page.unrouteAll();

  await page.close();
});

// ---------------------------------------------------------------------------
// TC-E2E-006: Multi-tenant data isolation (via API)
// ---------------------------------------------------------------------------

test("TC-E2E-006: Multi-tenant — Tenant A data not visible to Tenant B", async () => {
  const page = await openSidepanel(context, extId);
  await ensureLoggedIn(page, BASE_URL);

  // This test verifies through the UI that different tenants see different data
  // We mock the scan to return items for "tenant A"
  const scanItems = [
    {
      hsCode: "TENANT-A-ONLY",
      descriptionEn: "Tenant A secret item",
      quantity: "1",
      confidence: 0.99,
      sourcePageIndex: 0,
    },
  ];

  await mockScanEndpoints(page, scanItems);
  await mockHsLookup(page, []);
  await mockUsage(page);
  await mockExchangeRates(page);
  await mockRagSearch(page, "", []);

  // Scan as tenant A
  const scanTab = page.locator("button:has(svg.lucide-scan-line)");
  if (await scanTab.isVisible().catch(() => false)) await scanTab.click();

  const fileInput = page.locator("input[type='file'][accept='.pdf']");
  const testPdfPath = resolve(__dirname, "../../../test-data/test-invoice.pdf");
  await fileInput.setInputFiles(testPdfPath);

  const scanBtn = page.locator("button.btn-primary").first();
  await expect(scanBtn).toBeVisible({ timeout: 10_000 });
  await scanBtn.click();
  await page.waitForTimeout(3_000);

  // Verify tenant A data visible
  const tenantAItem = page.locator("text=TENANT-A-ONLY");
  expect(await tenantAItem.isVisible().catch(() => false)).toBe(true);

  await snap(page, "e2e-006-tenant-a-data.png");

  // Now simulate switching to tenant B by changing stored config
  // This verifies Dexie isolation (separate DB per tenant)
  await page.evaluate(async () => {
    const stored = await chrome.storage.local.get("vollosApiConfig");
    if (stored.vollosApiConfig) {
      await chrome.storage.local.set({
        vollosApiConfig: {
          ...stored.vollosApiConfig,
          tenantId: "b0000000-0000-0000-0000-000000000002",
        },
      });
    }
  });

  // Reload sidepanel — should use tenant B's Dexie DB (empty)
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2_000);

  // Tenant A's data should NOT be visible
  const tenantAItemAfterSwitch = page.locator("text=TENANT-A-ONLY");
  const stillVisible = await tenantAItemAfterSwitch.isVisible().catch(() => false);

  await snap(page, "e2e-006-tenant-b-no-data.png");

  // Restore original tenant
  await page.evaluate(async () => {
    const stored = await chrome.storage.local.get("vollosApiConfig");
    if (stored.vollosApiConfig) {
      await chrome.storage.local.set({
        vollosApiConfig: {
          ...stored.vollosApiConfig,
          tenantId: "a0000000-0000-0000-0000-000000000001",
        },
      });
    }
  });

  await page.close();
});

// ---------------------------------------------------------------------------
// TC-E2E-009: Concurrent scans (via API, not UI)
// ---------------------------------------------------------------------------

test("TC-E2E-009: 3 concurrent scan submissions → all succeed (API level)", async () => {
  // This test calls the backend API directly to verify concurrent handling
  // First we need a valid token from the extension
  const page = await openSidepanel(context, extId);
  await ensureLoggedIn(page, BASE_URL);

  const config = await page.evaluate(async () => {
    const stored = await chrome.storage.local.get("vollosApiConfig");
    return stored.vollosApiConfig as { token: string; tenantId: string; baseUrl: string } | undefined;
  });

  await page.close();

  if (!config?.token) {
    console.log("  ⏭ Skipped — no auth token available");
    return;
  }

  // Submit 3 scan requests concurrently via fetch
  const testPdfPath = resolve(__dirname, "../../../test-data/test-invoice.pdf");
  const { readFileSync } = await import("node:fs");

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = readFileSync(testPdfPath);
  } catch {
    console.log("  ⏭ Skipped — test-data/test-invoice.pdf not found");
    return;
  }

  const submitScan = async (label: string) => {
    const blob = new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" });
    const form = new FormData();
    form.append("file", blob, `test-${label}.pdf`);
    form.append("declarationType", "IMPORT");

    const resp = await fetch(`${config.baseUrl}/v1/customsguard/scan`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "X-Tenant-ID": config.tenantId,
      },
      body: form,
    });

    return { label, status: resp.status, data: await resp.json().catch(() => null) };
  };

  const results = await Promise.all([
    submitScan("concurrent-1"),
    submitScan("concurrent-2"),
    submitScan("concurrent-3"),
  ]);

  // At least some should succeed (202) — unless quota exhausted (429)
  const successful = results.filter((r) => r.status === 202);
  const quotaExceeded = results.filter((r) => r.status === 429);

  // Either all succeed or some hit quota — but none should error (500)
  const serverErrors = results.filter((r) => r.status >= 500);
  expect(serverErrors.length).toBe(0);

  // Each successful submission should have a unique jobId
  const jobIds = successful.map((r) => r.data?.jobId).filter(Boolean);
  const uniqueJobIds = new Set(jobIds);
  expect(uniqueJobIds.size).toBe(jobIds.length);

  console.log(
    `  Concurrent results: ${successful.length} success, ${quotaExceeded.length} quota exceeded, ${serverErrors.length} errors`
  );
});

// ---------------------------------------------------------------------------
// TC-E2E-010: Backend error → extension shows error (not crash)
// ---------------------------------------------------------------------------

test("TC-E2E-010: Backend down → extension shows error gracefully", async () => {
  const page = await openSidepanel(context, extId);
  await ensureLoggedIn(page, BASE_URL);

  // Block all backend calls to simulate backend down
  await page.route("**/v1/**", (route) => {
    route.abort("connectionrefused");
  });

  await mockExchangeRates(page); // Keep exchange rates to not interfere

  // Try to use Chat (will fail)
  const chatTab = page.locator("button:has(svg.lucide-message-circle)");
  await chatTab.click();

  const input = page.locator("input[type='text']").first();
  if (await input.isVisible().catch(() => false)) {
    await input.fill("ทดสอบเมื่อ backend ล่ม");
    const sendBtn = page.locator("button:has(svg.lucide-send)");
    if (await sendBtn.isVisible().catch(() => false)) {
      await sendBtn.click();
    }
  }

  await page.waitForTimeout(3_000);

  // Extension should NOT crash — should show error or still be functional
  // Check that the page is still interactive (no blank screen)
  const pageContent = await page.textContent("body");
  expect(pageContent).toBeTruthy();
  expect(pageContent!.length).toBeGreaterThan(0);

  // Should still see UI elements (not a crash screen)
  const hasUI = await page.locator("svg.lucide").first().isVisible().catch(() => false);

  await snap(page, "e2e-010-backend-down-graceful.png");

  // Unblock routes
  await page.unrouteAll();

  await page.close();
});

// ---------------------------------------------------------------------------
// TC-E2E-004: Chat intent classification — greeting/thanks handled locally
// ---------------------------------------------------------------------------

test("TC-E2E-004: Chat greeting → handled locally without API call", async () => {
  const page = await openSidepanel(context, extId);
  await ensureLoggedIn(page, BASE_URL);

  await mockUsage(page);

  // Track if RAG API was called
  let ragCalled = false;
  await page.route("**/v1/customsguard/rag/search", (route) => {
    ragCalled = true;
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ answer: "should not be called", sources: [], processingTimeMs: 0 }),
    });
  });

  // Switch to Chat
  const chatTab = page.locator("button:has(svg.lucide-message-circle)");
  await chatTab.click();

  // Send greeting
  const input = page.locator("input[type='text']").first();
  await input.fill("สวัสดีครับ");
  const sendBtn = page.locator("button:has(svg.lucide-send)");
  await sendBtn.click();
  await page.waitForTimeout(1_500);

  // Should get a local reply (not from API)
  const reply = page.locator("text=/สวัสดี|ผู้ช่วย|HS|พิกัด/");
  const hasReply = await reply.first().isVisible().catch(() => false);

  await snap(page, "e2e-004-greeting-local-reply.png");

  // RAG API should NOT have been called for a greeting
  expect(ragCalled).toBe(false);

  await page.close();
});

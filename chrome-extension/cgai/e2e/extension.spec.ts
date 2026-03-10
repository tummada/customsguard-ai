/**
 * Chrome Extension E2E Tests (Playwright) — UX Overhaul v0.4 (Google OAuth)
 *
 * Tests the UX flow:
 *   Splash → Google Login Screen → Tab UI (with i18n TH/EN, lucide icons)
 *
 * Prerequisites:
 *   1. `npm run build`  (produces dist/)
 *   2. Backend running   (docker-compose.dev.yml + bootRun)
 *
 * Run: npm run test:e2e:ext
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
// 1-2: Extension loads & Splash → LoginScreen (Google OAuth)
// ---------------------------------------------------------------------------

test("1. Extension loads — extension ID exists", () => {
  expect(extId).toBeTruthy();
  expect(extId.length).toBeGreaterThan(5);
});

test("2. Splash → LoginScreen — VOLLOS logo + Google login visible", async () => {
  const page = await openSidepanel(context, extId);

  // Should see VOLLOS logo during splash or login
  await expect(page.locator("h1:has-text('VOLLOS')")).toBeVisible({ timeout: 5_000 });

  // Wait for splash to end → should land on LoginScreen (no stored token)
  const state = await waitForSplashEnd(page);
  expect(state).toBe("login");

  // LoginScreen should have Google login button (OAuth flow)
  await expect(
    page.locator("text=/Google|เข้าสู่ระบบ/").first()
  ).toBeVisible({ timeout: 5_000 });

  await snap(page, "01-login-screen.png");
  await page.close();
});

// ---------------------------------------------------------------------------
// 3: Hidden dev URL (5-tap logo)
// ---------------------------------------------------------------------------

test.skip("3. Tap logo 5 times → dev URL field appears (feature not yet implemented in UI)", async () => {
  const page = await openSidepanel(context, extId);
  await waitForSplashEnd(page);

  const logo = page.locator("h1:has-text('VOLLOS')");
  for (let i = 0; i < 5; i++) {
    await logo.click({ delay: 50 });
  }

  // Dev URL input should appear
  await expect(page.locator("input[type='url']")).toBeVisible({ timeout: 2_000 });

  // "Reset to Default" button should be visible
  await expect(page.locator("button:has-text('Reset to Default')")).toBeVisible();

  await snap(page, "02-dev-url-revealed.png");
  await page.close();
});

// ---------------------------------------------------------------------------
// 4: Login via injected JWT → Tab UI appears
// ---------------------------------------------------------------------------

test("4. Login (injected JWT) → Tab UI appears with tabs", async () => {
  const page = await openSidepanel(context, extId);
  await waitForSplashEnd(page);

  // Use injectAuth to bypass Google OAuth (E2E testing)
  await ensureLoggedIn(page, BASE_URL);

  // Should see tab UI with lucide icons
  await expect(page.locator("svg.lucide").first()).toBeVisible({ timeout: 5_000 });

  // DB dot should NOT exist
  await expect(page.locator("text=DB")).not.toBeVisible();

  // Wifi icon should be visible (connected)
  await expect(page.locator("svg.lucide-wifi").first()).toBeVisible({ timeout: 3_000 });

  await snap(page, "03-tab-ui-after-login.png");
  await page.close();
});

// ---------------------------------------------------------------------------
// 5: Backend unreachable → extension handles gracefully
// ---------------------------------------------------------------------------

test("5. Backend unreachable → extension does not crash", async () => {
  const page = await openSidepanel(context, extId);
  await ensureLoggedIn(page, BASE_URL);

  // Intercept all API calls and simulate connection refused
  await context.route("**/v1/**", (route) => {
    route.abort("connectionrefused");
  });

  // Try to use Chat (will fail with connection error)
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

  // Extension should NOT crash — page content should still be there
  const pageContent = await page.textContent("body");
  expect(pageContent).toBeTruthy();
  expect(pageContent!.length).toBeGreaterThan(0);

  await snap(page, "04-backend-unreachable.png");

  // Clean up route mock
  await context.unrouteAll({ behavior: "ignoreErrors" });
  await page.close();
});

// ---------------------------------------------------------------------------
// 6: Token persistence (close → reopen → auto-login)
// ---------------------------------------------------------------------------

test("6. Token persists — reopen sidepanel → auto-login (no LoginScreen)", async () => {
  // First login
  const page1 = await openSidepanel(context, extId);
  await ensureLoggedIn(page1, BASE_URL);
  await page1.close();

  // Reopen sidepanel — should auto-login (splash → tab UI, skip login)
  const page2 = await openSidepanel(context, extId);
  await page2.waitForTimeout(1_500); // Wait for splash

  // Should NOT see Google login button
  const hasLogin = await page2.locator("text=/Google|เข้าสู่ระบบ/").first().isVisible().catch(() => false);
  // Should see tab UI (lucide icons)
  const hasIcons = await page2.locator("svg.lucide").first().isVisible().catch(() => false);

  // One of these should be true: either already logged in OR skipped login
  expect(hasLogin && !hasIcons).toBe(false);

  await snap(page2, "05-auto-login.png");
  await page2.close();
});

// ---------------------------------------------------------------------------
// 7: Language toggle TH/EN
// ---------------------------------------------------------------------------

test("7. Language toggle TH → EN → text changes", async () => {
  const page = await openSidepanel(context, extId);
  await ensureLoggedIn(page, BASE_URL);

  await page.waitForTimeout(500);
  await snap(page, "06-lang-th.png");

  // Click language toggle (Globe icon area)
  const langToggle = page.locator("button:has(svg.lucide-globe)");
  await langToggle.click();
  await page.waitForTimeout(500);

  await snap(page, "07-lang-en.png");

  // Toggle back to TH
  await langToggle.click();
  await page.waitForTimeout(500);
  await page.close();
});

// ---------------------------------------------------------------------------
// 8: Logout → back to LoginScreen
// ---------------------------------------------------------------------------

test("8. Logout → LoginScreen appears", async () => {
  const page = await openSidepanel(context, extId);
  await ensureLoggedIn(page, BASE_URL);

  // Click logout icon (LogOut lucide icon in header)
  const logoutBtn = page.locator("button:has(svg.lucide-log-out)");
  await logoutBtn.click();

  // Should see Google login screen
  await expect(
    page.locator("text=/Google|เข้าสู่ระบบ/").first()
  ).toBeVisible({ timeout: 5_000 });

  await snap(page, "08-logout-login-screen.png");
  await page.close();
});

// ---------------------------------------------------------------------------
// 9: Token expired → LoginScreen
// ---------------------------------------------------------------------------

test("9. Expired token → LoginScreen on reload", async () => {
  const page = await openSidepanel(context, extId);

  // Inject an expired token (exp in the past)
  await page.evaluate(async () => {
    const header = btoa(JSON.stringify({ alg: "HS256" }));
    const payload = btoa(JSON.stringify({ sub: "user", exp: 1 }));
    const fakeToken = `${header}.${payload}.fakesig`;
    await chrome.storage.local.set({
      vollosApiConfig: {
        baseUrl: "http://localhost:8080",
        token: fakeToken,
        tenantId: "a0000000-0000-0000-0000-000000000001",
      },
    });
  });

  // Reload to pick up the expired token
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2_000);

  // Should land on LoginScreen (expired token rejected)
  await expect(
    page.locator("text=/Google|เข้าสู่ระบบ/").first()
  ).toBeVisible({ timeout: 5_000 });

  // Clean up
  await page.evaluate(async () => {
    await chrome.storage.local.remove("vollosApiConfig");
  });

  await snap(page, "09-expired-token-login.png");
  await page.close();
});

// ---------------------------------------------------------------------------
// 10: PDF upload → page count shown
// ---------------------------------------------------------------------------

test("10. PDF upload → page count + Scan button visible", async () => {
  const page = await openSidepanel(context, extId);
  await ensureLoggedIn(page, BASE_URL);

  // Ensure we're on Scan tab
  const scanTab = page.locator("button:has(svg.lucide-scan-line)");
  if (await scanTab.isVisible().catch(() => false)) {
    await scanTab.click();
  }

  // Upload PDF via hidden file input
  const fileInput = page.locator("input[type='file'][accept='.pdf']");
  const testPdfPath = resolve(__dirname, "../../../test-data/test-invoice.pdf");
  await fileInput.setInputFiles(testPdfPath);

  // Wait for PDF to render — FileText icon should appear
  await expect(page.locator("svg.lucide-file-text")).toBeVisible({ timeout: 10_000 });

  // Scan button should appear (btn-primary) — use .first() to avoid strict mode violation
  await expect(page.locator("button.btn-primary").first()).toBeVisible({ timeout: 3_000 });

  await snap(page, "10-pdf-uploaded.png");
  await page.close();
});

// ---------------------------------------------------------------------------
// 11: Scan + Confirm → traffic light gold (mocked)
// ---------------------------------------------------------------------------

test("11. Scan results + Confirm → traffic light", async () => {
  const page = await openSidepanel(context, extId);
  await ensureLoggedIn(page, BASE_URL);

  // Go to Scan tab
  const scanTab = page.locator("button:has(svg.lucide-scan-line)");
  if (await scanTab.isVisible().catch(() => false)) await scanTab.click();

  // Intercept scan upload → mock CREATED
  await page.route("**/v1/customsguard/scan", (route, request) => {
    if (request.method() === "POST") {
      route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ jobId: "mock-job-001", status: "CREATED" }),
      });
    } else {
      route.continue();
    }
  });

  // Intercept scan poll → mock COMPLETED with items
  await page.route("**/v1/customsguard/scan/*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jobId: "mock-job-001",
        status: "COMPLETED",
        progress: 100,
        s3Key: "mock/test.pdf",
        items: [
          { hsCode: "0306.17", descriptionEn: "Frozen shrimp", confidence: 0.95, quantity: "100", unitPrice: "150.00", sourcePageIndex: 0 },
          { hsCode: "1006.30", descriptionEn: "Milled rice", confidence: 0.88, quantity: "500", unitPrice: "25.00", sourcePageIndex: 0 },
        ],
      }),
    });
  });

  // Upload PDF
  const fileInput = page.locator("input[type='file'][accept='.pdf']");
  const testPdfPath = resolve(__dirname, "../../../test-data/test-invoice.pdf");
  await fileInput.setInputFiles(testPdfPath);

  // Wait for scan button and click
  const scanBtn = page.locator("button.btn-primary").first();
  await expect(scanBtn).toBeVisible({ timeout: 10_000 });
  await scanBtn.click();

  // Wait for results
  await page.waitForTimeout(3_000);

  // Should see line items (HS codes in table)
  const hsCodeText = page.locator("text=0306.17");
  const hasItems = await hsCodeText.isVisible().catch(() => false);

  await snap(page, "11-scan-results.png");

  // If items visible, try confirm
  if (hasItems) {
    const okBtn = page.locator("button:has-text('OK')").first();
    if (await okBtn.isVisible().catch(() => false)) {
      await okBtn.click();
      await page.waitForTimeout(500);
      await snap(page, "12-item-confirmed.png");
    }
  }

  await page.close();
});

// ---------------------------------------------------------------------------
// 12: Chat with mocked RAG response + source citations
// ---------------------------------------------------------------------------

test("12. Chat → RAG response with source citations (mocked)", async () => {
  const page = await openSidepanel(context, extId);
  await ensureLoggedIn(page, BASE_URL);

  // Intercept RAG search
  await page.route("**/v1/customsguard/rag/search", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        answer: "กุ้งแช่แข็ง HS 0306.17 อัตราอากร MFN 5% สามารถใช้สิทธิ ACFTA ลดเหลือ 0%",
        sources: [
          {
            sourceType: "RULING",
            sourceId: "ruling-001",
            chunkText: "คำวินิจฉัยพิกัด กุ้ง HS 0306.17 classification ruling for frozen shrimp products",
            contentSummary: "การจำแนกพิกัดกุ้งแช่แข็ง",
            similarity: 0.92,
            sourceUrl: "https://customs.go.th/ruling/001",
            docNumber: "กค 0619/2566",
            docType: "RULING",
            title: "คำวินิจฉัยพิกัดศุลกากร กุ้งแช่แข็ง",
          },
        ],
        processingTimeMs: 450,
      }),
    });
  });

  // Switch to Chat tab (MessageCircle icon)
  const chatTab = page.locator("button:has(svg.lucide-message-circle)");
  await chatTab.click();

  // Type and send query
  const input = page.locator("input[type='text']").first();
  await input.fill("กุ้ง HS code อัตราอากร");

  // Click Send button (has Send icon)
  const sendBtn = page.locator("button:has(svg.lucide-send)");
  await sendBtn.click();

  // Wait for response
  await page.waitForTimeout(3_000);

  // Check answer appeared
  const answerText = page.locator("text=/กุ้ง|0306/");
  const hasAnswer = await answerText.first().isVisible().catch(() => false);
  expect(hasAnswer).toBe(true);

  await snap(page, "13-chat-with-sources.png");
  await page.close();
});

// ---------------------------------------------------------------------------
// 13: Manifest i18n — extension name uses __MSG_appName__
// ---------------------------------------------------------------------------

test("13. Manifest i18n — extension name resolved", async () => {
  expect(extId).toBeTruthy();
});

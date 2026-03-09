import { chromium, expect, type BrowserContext, type Page } from "@playwright/test";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_PATH = resolve(__dirname, "../dist");

/**
 * Generate a fake JWT for E2E testing.
 * Creates a valid-looking token with future expiry so apiClient.loadConfig() accepts it.
 */
function makeFakeJwt(tenantId: string, userId = "e2e-user-001"): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: userId,
      tenantId,
      email: "e2e@vollos.local",
      exp: Math.floor(Date.now() / 1000) + 86400, // 24h from now
      iat: Math.floor(Date.now() / 1000),
    })
  );
  const sig = btoa("e2e-fake-signature");
  return `${header}.${payload}.${sig}`;
}

/**
 * Launch Chromium with the built extension loaded.
 * Uses `--headless=new` which supports extension loading (unlike old headless).
 *
 * IMPORTANT: You must run `npm run build` before calling this.
 */
export async function launchExtension(): Promise<BrowserContext> {
  if (!existsSync(resolve(DIST_PATH, "manifest.json"))) {
    throw new Error(
      "dist/manifest.json not found. Run `npm run build` first."
    );
  }

  const videoDir = resolve(DIST_PATH, "../e2e-results/videos");
  if (!existsSync(videoDir)) mkdirSync(videoDir, { recursive: true });

  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      `--disable-extensions-except=${DIST_PATH}`,
      `--load-extension=${DIST_PATH}`,
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
    ],
    recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } },
  });

  // Wait for service worker to register
  await context.waitForEvent("serviceworker", { timeout: 10_000 }).catch(() => {
    // Extension might already be registered, continue
  });

  return context;
}

/**
 * Extract the extension ID from service workers.
 * The service worker URL is: chrome-extension://<id>/service-worker-loader.js
 */
export function getExtensionId(context: BrowserContext): string {
  const workers = context.serviceWorkers();
  for (const sw of workers) {
    const url = sw.url();
    const match = url.match(/chrome-extension:\/\/([a-z]+)\//);
    if (match) return match[1];
  }
  throw new Error(
    "Could not find extension ID. Service workers: " +
      workers.map((sw) => sw.url()).join(", ")
  );
}

/**
 * Open the sidepanel page directly by navigating to the extension URL.
 * In test mode, we open it as a regular page since Playwright cannot
 * programmatically open the Chrome side panel.
 */
export async function openSidepanel(context: BrowserContext, extId: string) {
  const page = await context.newPage();
  await page.goto(
    `chrome-extension://${extId}/src/sidepanel/index.html`,
    { waitUntil: "domcontentloaded" }
  );
  return page;
}

/**
 * Wait for Splash to finish and land on LoginScreen or Tab UI.
 * Returns the current auth state.
 */
export async function waitForSplashEnd(page: Page): Promise<"login" | "ready"> {
  // Wait for either Google login button or Tab UI to appear (max 8s)
  const googleBtn = page.locator("text=/Google|เข้าสู่ระบบ/");
  const tabButtons = page.locator("button:has(svg.lucide-scan-line)");

  await Promise.race([
    googleBtn.first().waitFor({ state: "visible", timeout: 8_000 }).catch(() => {}),
    tabButtons.first().waitFor({ state: "visible", timeout: 8_000 }).catch(() => {}),
  ]);

  // If Google login button visible → login screen
  if (await googleBtn.first().isVisible().catch(() => false)) {
    // Double-check it's not the main UI (which also has buttons)
    const hasTabs = await tabButtons.first().isVisible().catch(() => false);
    if (!hasTabs) return "login";
  }
  return "ready";
}

/**
 * Inject a fake auth token into chrome.storage.local so the extension
 * skips login and goes straight to the main UI.
 * Must be called on an extension page (chrome-extension:// origin).
 */
export async function injectAuth(
  page: Page,
  baseUrl: string,
  tenantId = "a0000000-0000-0000-0000-000000000001"
): Promise<void> {
  const fakeToken = makeFakeJwt(tenantId);
  await page.evaluate(
    async ({ token, tenant, url }) => {
      await chrome.storage.local.set({
        vollosApiConfig: { baseUrl: url, token, tenantId: tenant },
      });
    },
    { token: fakeToken, tenant: tenantId, url: baseUrl }
  );
}

/**
 * Ensure sidepanel is logged in.
 * Injects a fake JWT into chrome.storage.local, then reloads the page
 * so AuthProvider.loadConfig() picks it up and skips login.
 */
export async function ensureLoggedIn(page: Page, baseUrl: string): Promise<void> {
  const state = await waitForSplashEnd(page);
  if (state === "login") {
    // Inject auth config and reload so the extension reads it
    await injectAuth(page, baseUrl);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);
  }
  // Wait for main UI to be visible (tab bar buttons)
  await page.locator("button").first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
}

/** Create e2e-results/manual/ directory if not exists */
export function ensureManualDir(): string {
  const dir = resolve(DIST_PATH, "../e2e-results/manual");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

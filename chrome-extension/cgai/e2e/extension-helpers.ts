import { chromium, expect, type BrowserContext, type Page } from "@playwright/test";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_PATH = resolve(__dirname, "../dist");

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
 * Ensure sidepanel is logged in; login if Offline.
 */
export async function ensureLoggedIn(page: Page, baseUrl: string): Promise<void> {
  const offlineText = page.locator("text=Offline");
  if (await offlineText.isVisible().catch(() => false)) {
    await page.locator("button[title='Settings']").click();
    await page.locator("input[type='url']").fill(baseUrl);
    await page.locator("input[type='email']").fill("e2e@vollos.local");
    await page.locator("input[type='password']").fill("test123");
    await page.locator("button", { hasText: "Login" }).click();
    await expect(page.locator("text=Connected")).toBeVisible({ timeout: 10_000 });
    const closeBtn = page.locator("button", { hasText: "Close" });
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
  }
}

/** Create e2e-results/manual/ directory if not exists */
export function ensureManualDir(): string {
  const dir = resolve(DIST_PATH, "../e2e-results/manual");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

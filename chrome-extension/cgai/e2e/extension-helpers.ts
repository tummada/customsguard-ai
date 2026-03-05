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
 * Wait for Splash to finish and land on LoginScreen or Tab UI.
 * Returns the current auth state.
 */
export async function waitForSplashEnd(page: Page): Promise<"login" | "ready"> {
  // Wait for either LoginScreen or Tab UI to appear (max 5s)
  const loginEmail = page.locator("input[type='email']");
  const tabBar = page.locator("button >> nth=0"); // First tab button

  await Promise.race([
    loginEmail.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {}),
    page.waitForTimeout(3_000),
  ]);

  if (await loginEmail.isVisible().catch(() => false)) {
    return "login";
  }
  return "ready";
}

/**
 * Login via the new LoginScreen.
 * Taps logo 5 times to reveal dev URL field, sets URL, then logs in.
 */
export async function loginViaLoginScreen(
  page: Page,
  baseUrl: string,
  email = "e2e@vollos.local",
  password = "test123"
): Promise<void> {
  // Wait for login screen
  await expect(page.locator("input[type='email']")).toBeVisible({ timeout: 5_000 });

  // Tap VOLLOS logo 5 times to reveal dev URL
  const logo = page.locator("h1:has-text('VOLLOS')");
  for (let i = 0; i < 5; i++) {
    await logo.click({ delay: 50 });
  }

  // Wait for dev URL field to appear
  const devUrlInput = page.locator("input[type='url']");
  await expect(devUrlInput).toBeVisible({ timeout: 2_000 });

  // Fill dev URL
  await devUrlInput.fill(baseUrl);
  await page.locator("button:has-text('Save')").click();

  // Fill credentials
  await page.locator("input[type='email']").fill(email);
  await page.locator("input[type='password']").fill(password);

  // Click login button (matches Thai or English)
  const loginBtn = page.locator("button.btn-primary").first();
  await loginBtn.click();

  // Wait for tab UI to appear (login success)
  // Look for the tab bar which has multiple buttons
  await page.waitForTimeout(3_000);
}

/**
 * Ensure sidepanel is logged in; login if on LoginScreen.
 */
export async function ensureLoggedIn(page: Page, baseUrl: string): Promise<void> {
  const state = await waitForSplashEnd(page);
  if (state === "login") {
    await loginViaLoginScreen(page, baseUrl);
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

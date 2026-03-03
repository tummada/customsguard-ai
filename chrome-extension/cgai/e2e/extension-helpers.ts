import { chromium, type BrowserContext } from "@playwright/test";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

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

  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      `--disable-extensions-except=${DIST_PATH}`,
      `--load-extension=${DIST_PATH}`,
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
    ],
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

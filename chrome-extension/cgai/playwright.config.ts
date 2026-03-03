import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  testMatch: "*.spec.ts",
  timeout: 30_000,
  retries: 0,
  workers: 1, // Chrome extension tests must run sequentially
  use: {
    headless: false, // Extension loading requires headed or --headless=new
  },
});

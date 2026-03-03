import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["e2e/**/*.e2e.test.ts"],
    testTimeout: 30_000,
    // Run sequentially — tests depend on prior state (seed → search → upload → poll)
    sequence: { concurrent: false },
  },
});

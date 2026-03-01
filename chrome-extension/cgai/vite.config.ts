import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";
import { resolve } from "path";
import { copyFileSync, existsSync, mkdirSync } from "fs";

// Copy pdf.worker to public so it's accessible at runtime
function copyPdfWorker() {
  return {
    name: "copy-pdf-worker",
    buildStart() {
      const src = resolve(
        __dirname,
        "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
      );
      const destDir = resolve(__dirname, "public");
      const dest = resolve(destDir, "pdf.worker.min.mjs");

      if (existsSync(src)) {
        if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
        copyFileSync(src, dest);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), copyPdfWorker(), crx({ manifest })],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, "src/sidepanel/index.html"),
      },
    },
  },
});

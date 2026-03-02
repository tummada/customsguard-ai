import { submitScanToBackend, pollScanResult } from "./ai-proxy";
import { apiClient } from "@/lib/api-client";
import type {
  ScanPdfResponse,
  BackgroundMessage,
} from "@/types";

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error);

chrome.runtime.onInstalled.addListener(async () => {
  console.log("[VOLLOS] Customs Guard AI Extension installed");
  await apiClient.loadConfig();
});

// Load config on service worker startup
apiClient.loadConfig().catch(console.error);

// Message handler
chrome.runtime.onMessage.addListener(
  (
    message: BackgroundMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    if (message.type === "SCAN_PDF") {
      handleScanPdf(message, sendResponse);
      return true;
    }

    if (message.type === "SET_AUTH") {
      handleSetAuth(message, sendResponse);
      return true;
    }

    if (message.type === "FTA_LOOKUP") {
      handleFtaLookup(message, sendResponse);
      return true;
    }

    if (message.type === "RAG_SEARCH") {
      handleRagSearch(message, sendResponse);
      return true;
    }
  }
);

async function handleScanPdf(
  message: BackgroundMessage & { type: "SCAN_PDF" },
  sendResponse: (response: ScanPdfResponse) => void
) {
  try {
    if (!apiClient.isConfigured()) {
      sendResponse({
        success: false,
        error: "กรุณาเข้าสู่ระบบ VOLLOS ก่อนใช้งาน",
      });
      return;
    }

    console.log("[VOLLOS] Submitting PDF scan to backend...");
    const { jobId } = await submitScanToBackend(message.payload.pdfDataUrl);
    console.log(`[VOLLOS] Scan job created: ${jobId}`);

    const items = await pollScanResult(jobId);
    console.log(`[VOLLOS] Scan complete: ${items.length} items`);

    sendResponse({ success: true, items, jobId });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[VOLLOS] Scan error:", errorMessage);
    sendResponse({ success: false, error: errorMessage });
  }
}

async function handleSetAuth(
  message: BackgroundMessage & { type: "SET_AUTH" },
  sendResponse: (response: { success: boolean }) => void
) {
  try {
    const { baseUrl, token, tenantId } = message.payload;
    await apiClient.configure(baseUrl, token, tenantId);
    console.log("[VOLLOS] Backend auth configured");
    sendResponse({ success: true });
  } catch {
    sendResponse({ success: false });
  }
}

async function handleFtaLookup(
  message: BackgroundMessage & { type: "FTA_LOOKUP" },
  sendResponse: (response: unknown) => void
) {
  try {
    const results = await apiClient.hsLookup(
      message.payload.codes,
      message.payload.originCountry
    );
    sendResponse({ success: true, results });
  } catch (err) {
    sendResponse({
      success: false,
      error: err instanceof Error ? err.message : "FTA lookup failed",
    });
  }
}

async function handleRagSearch(
  message: BackgroundMessage & { type: "RAG_SEARCH" },
  sendResponse: (response: unknown) => void
) {
  try {
    const result = await apiClient.ragSearch(message.payload.query);
    sendResponse({ success: true, ...result });
  } catch (err) {
    sendResponse({
      success: false,
      error: err instanceof Error ? err.message : "RAG search failed",
    });
  }
}

import { extractViaGemini } from "./ai-proxy";
import type {
  ScanPdfMessage,
  ScanPdfResponse,
  ApiKeySetMessage,
  ApiKeySetResponse,
  BackgroundMessage,
} from "@/types";

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error);

chrome.runtime.onInstalled.addListener(() => {
  console.log("[VOLLOS] Customs Guard AI Extension installed");
});

// Message handler for AI proxy and API key management
chrome.runtime.onMessage.addListener(
  (
    message: BackgroundMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ScanPdfResponse | ApiKeySetResponse) => void
  ) => {
    if (message.type === "SCAN_PDF") {
      handleScanPdf(message, sendResponse);
      return true; // keep channel open for async
    }

    if (message.type === "SET_API_KEY") {
      handleSetApiKey(message, sendResponse);
      return true;
    }
  }
);

async function handleScanPdf(
  message: ScanPdfMessage,
  sendResponse: (response: ScanPdfResponse) => void
) {
  try {
    const { provider, pages } = message.payload;

    // Read API key from chrome.storage.local (never from message)
    const storageKey = `apiKey_${provider}`;
    const result = await chrome.storage.local.get(storageKey);
    const apiKey = result[storageKey] as string | undefined;

    if (!apiKey) {
      sendResponse({
        success: false,
        error: `API key not configured for ${provider}. กรุณาตั้งค่า API key ก่อน`,
      });
      return;
    }

    console.log(
      `[VOLLOS] Scanning ${pages.length} pages with ${provider}...`
    );

    const items = await extractViaGemini(pages, apiKey);

    console.log(`[VOLLOS] Extracted ${items.length} line items`);
    sendResponse({ success: true, items });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[VOLLOS] Scan error:", errorMessage);
    sendResponse({ success: false, error: errorMessage });
  }
}

async function handleSetApiKey(
  message: ApiKeySetMessage,
  sendResponse: (response: ApiKeySetResponse) => void
) {
  try {
    const { provider, key } = message.payload;
    const storageKey = `apiKey_${provider}`;
    await chrome.storage.local.set({ [storageKey]: key });
    console.log(`[VOLLOS] API key saved for ${provider}`);
    sendResponse({ success: true });
  } catch {
    sendResponse({ success: false });
  }
}

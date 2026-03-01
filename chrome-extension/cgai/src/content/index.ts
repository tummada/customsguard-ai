import { FuzzySelectorEngine, setupIframeListener } from "./engine";
import type { MagicFillMessage, MagicFillResponse } from "@/types";

// Instantiate engine immediately on content script load
const engine = new FuzzySelectorEngine();

// Set up cross-origin iFrame listener
setupIframeListener(engine);

// Listen for messages from side panel / background script
chrome.runtime.onMessage.addListener(
  (
    message: MagicFillMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: MagicFillResponse) => void
  ) => {
    if (message.type === "MAGIC_FILL") {
      try {
        const { filledCount, results } = engine.fill(message.payload);

        const errors = results.filter((r) => !r.success);
        if (errors.length > 0) {
          console.warn("[VOLLOS] Some fields not found:", errors);
        }

        sendResponse({ success: true, filledCount });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("[VOLLOS] Magic Fill error:", errorMessage);
        sendResponse({ success: false, error: errorMessage });
      }
    }

    // Return true to keep the message channel open for async response
    return true;
  }
);

console.log("[VOLLOS] Content script loaded - Magic Fill ready");

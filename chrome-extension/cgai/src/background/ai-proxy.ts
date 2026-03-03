import { apiClient } from "@/lib/api-client";
import type { ExtractedLineItem } from "@/types";

/**
 * Submit a PDF scan job to the VOLLOS backend.
 * No more direct Gemini API calls — everything goes through our backend.
 */
export async function submitScanToBackend(
  pdfBase64: string
): Promise<{ jobId: string }> {
  const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "application/pdf" });

  const result = await apiClient.scanPdf(blob, "IMPORT");
  return { jobId: result.jobId };
}

/**
 * Poll backend for scan job completion.
 * Returns extracted items from the backend response.
 */
export async function pollScanResult(
  jobId: string,
  maxWaitMs = 120000,
  intervalMs = 3000
): Promise<ExtractedLineItem[]> {
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const result = await apiClient.getJobStatus(jobId);

    if (result.status === "COMPLETED") {
      return result.items ?? [];
    }

    if (result.status === "FAILED") {
      throw new Error("Scan job failed on the server");
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error("Scan job timed out after " + maxWaitMs + "ms");
}

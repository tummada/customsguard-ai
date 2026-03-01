import * as pdfjsLib from "pdfjs-dist";

// Point to locally bundled worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL(
  "pdf.worker.min.mjs"
);

export async function renderPdfToImages(
  fileBuffer: ArrayBuffer,
  scale = 2.0
): Promise<string[]> {
  const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
  const images: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    images.push(canvas.toDataURL("image/png"));
  }

  return images;
}

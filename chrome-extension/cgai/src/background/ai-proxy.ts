import type { ExtractedLineItem } from "@/types";

const EXTRACTION_PROMPT = `You are a Thai customs document data extraction AI. Analyze this invoice/customs document image and extract ALL line items.

For each line item, return:
- hsCode: HS tariff code (e.g. "8471.30.10"). If unsure, provide best guess.
- descriptionTh: Product description in Thai (if visible)
- descriptionEn: Product description in English
- quantity: Number of units as string
- weight: Weight in KG as string
- unitPrice: Price per unit as string
- cifPrice: CIF price (Cost + Insurance + Freight) as string
- currency: Currency code (e.g. "USD", "THB")
- confidence: Your confidence level 0.0-1.0 for this line item's accuracy
- aiReason: If confidence < 0.9, explain why (e.g. "blurry text", "ambiguous HS code")

Return ONLY valid JSON in this exact format:
{
  "items": [
    {
      "hsCode": "...",
      "descriptionTh": "...",
      "descriptionEn": "...",
      "quantity": "...",
      "weight": "...",
      "unitPrice": "...",
      "cifPrice": "...",
      "currency": "...",
      "confidence": 0.95,
      "aiReason": ""
    }
  ]
}`;

export async function extractViaGemini(
  pages: string[],
  apiKey: string
): Promise<ExtractedLineItem[]> {
  const allItems: ExtractedLineItem[] = [];

  // Build multi-image parts for Gemini
  const imageParts = pages.map((dataUrl) => {
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    return {
      inline_data: {
        mime_type: "image/png",
        data: base64,
      },
    };
  });

  const requestBody = {
    contents: [
      {
        parts: [
          { text: EXTRACTION_PROMPT },
          ...imageParts,
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const textContent =
    data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent) {
    throw new Error("Gemini returned empty response");
  }

  const parsed = JSON.parse(textContent);
  const items: ExtractedLineItem[] = (parsed.items || []).map(
    (item: ExtractedLineItem, _index: number) => ({
      hsCode: item.hsCode || "",
      descriptionTh: item.descriptionTh || "",
      descriptionEn: item.descriptionEn || "",
      quantity: item.quantity || "",
      weight: item.weight || "",
      unitPrice: item.unitPrice || "",
      cifPrice: item.cifPrice || "",
      currency: item.currency || "USD",
      confidence: typeof item.confidence === "number" ? item.confidence : 0.5,
      aiReason: item.aiReason || "",
      sourcePageIndex: 0, // all pages sent together
    })
  );

  allItems.push(...items);
  return allItems;
}

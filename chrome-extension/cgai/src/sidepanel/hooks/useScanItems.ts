import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { apiClient, isCacheValid, FTA_CACHE_TTL_MS, LPI_CACHE_TTL_MS, RAG_CACHE_TTL_MS } from "@/lib/api-client";
import type { CgDeclarationItem, CgFtaCache, CgLpiCache, ExtractedLineItem } from "@/types";

export function useScanItems(declarationLocalId: number) {
  const items = useLiveQuery(
    () =>
      db.cgDeclarationItems
        .where("declarationLocalId")
        .equals(declarationLocalId)
        .toArray(),
    [declarationLocalId],
    []
  );

  const unconfirmedCount = items.filter((i) => !i.isConfirmed).length;

  async function saveExtractedItems(
    extracted: ExtractedLineItem[]
  ): Promise<void> {
    const itemsToSave: CgDeclarationItem[] = extracted.map((e) => ({
      declarationLocalId,
      hsCode: e.hsCode,
      descriptionTh: e.descriptionTh,
      descriptionEn: e.descriptionEn,
      quantity: e.quantity,
      weight: e.weight,
      unitPrice: e.unitPrice,
      cifPrice: e.cifPrice,
      currency: e.currency,
      confidence: e.confidence,
      aiReason: e.aiReason,
      editStatus: "AI_EXTRACTED" as const,
      isConfirmed: false,
      sourcePageIndex: e.sourcePageIndex,
    }));

    await db.cgDeclarationItems.bulkAdd(itemsToSave);

    await db.cgAuditLogs.add({
      declarationLocalId,
      action: "AI_SCAN_COMPLETED",
      snapshotBefore: null,
      snapshotAfter: { itemCount: extracted.length },
      source: "EXTENSION",
      timestamp: new Date().toISOString(),
      syncStatus: "LOCAL_ONLY",
    });

    // Auto FTA lookup + knowledge base enrichment for extracted HS codes
    if (apiClient.isConfigured() && extracted.length > 0) {
      const codes = extracted.map((e) => e.hsCode);
      fetchAndCacheFtaRates(codes).catch((err) =>
        console.warn("[VOLLOS] Auto FTA lookup failed:", err)
      );
      fetchAndCacheLpiControls(codes).catch((err) =>
        console.warn("[VOLLOS] Auto LPI lookup failed:", err)
      );
      enrichWithKnowledgeBase(codes).catch((err) =>
        console.warn("[VOLLOS] KB enrichment failed:", err)
      );
      enrichItemsWithRag(codes).catch((err) =>
        console.warn("[VOLLOS] RAG enrichment failed:", err)
      );
    }
  }

  async function enrichItemsWithRag(hsCodes: string[]): Promise<void> {
    const uniqueCodes = [...new Set(hsCodes)].sort();
    const cacheKey = `__enrich:${uniqueCodes.join(",")}`;

    // Check cache first
    const cached = await db.cgRagCache.where("query").equals(cacheKey).first();
    if (cached && isCacheValid(cached.cachedAt, RAG_CACHE_TTL_MS)) {
      console.log("[VOLLOS] RAG enrichment served from cache");
      return;
    }

    const query = `กฎระเบียบและข้อปฏิบัติที่เกี่ยวข้องกับสินค้าพิกัด HS codes: ${uniqueCodes.join(", ")} สรุปสั้นๆ เฉพาะที่สำคัญ`;
    const result = await apiClient.ragSearch(query, 5);

    // Clear old cache for this key, then add new
    await db.cgRagCache.where("query").equals(cacheKey).delete();
    await db.cgRagCache.add({
      query: cacheKey,
      answer: result.answer,
      sources: result.sources,
      processingTimeMs: result.processingTimeMs,
      cachedAt: new Date().toISOString(),
    });
    console.log("[VOLLOS] RAG enrichment cached:", uniqueCodes.length, "HS codes");
  }

  async function enrichWithKnowledgeBase(hsCodes: string[]): Promise<void> {
    const uniqueCodes = [...new Set(hsCodes)];
    const results = await apiClient.hsLookup(uniqueCodes);
    const foundCodes = new Set(
      results.filter((r) => r.found).map((r) => r.code)
    );

    // Items not found in knowledge base → low confidence + warning
    const allItems = await db.cgDeclarationItems
      .where("declarationLocalId")
      .equals(declarationLocalId)
      .toArray();

    for (const item of allItems) {
      if (!foundCodes.has(item.hsCode) && item.editStatus === "AI_EXTRACTED") {
        await db.cgDeclarationItems.update(item.localId!, {
          confidence: 0.1,
          aiReason: "HS Code นี้ไม่พบในฐานข้อมูล กรุณาตรวจสอบ",
        });
      }
    }
  }

  async function fetchAndCacheFtaRates(hsCodes: string[]): Promise<void> {
    // Filter out codes that already have valid cache
    const codesToFetch: string[] = [];
    for (const code of hsCodes) {
      const cached = await db.cgFtaCache.where("hsCode").equals(code).first();
      if (!cached || !isCacheValid(cached.cachedAt, FTA_CACHE_TTL_MS)) {
        codesToFetch.push(code);
      }
    }

    if (codesToFetch.length === 0) return;

    const results = await apiClient.hsLookup(codesToFetch);
    const ftaEntries: CgFtaCache[] = [];
    const now = new Date().toISOString();

    for (const result of results) {
      if (result.found && result.ftaAlerts) {
        for (const alert of result.ftaAlerts) {
          ftaEntries.push({
            hsCode: result.code,
            ftaName: alert.ftaName,
            partnerCountry: alert.partnerCountry,
            formType: alert.formType,
            preferentialRate: alert.preferentialRate,
            savingPercent: alert.savingPercent,
            conditions: alert.conditions,
            sourceUrl: alert.sourceUrl,
            cachedAt: now,
          });
        }
      }
    }

    // Clear old entries for these codes, then add new
    for (const code of codesToFetch) {
      await db.cgFtaCache.where("hsCode").equals(code).delete();
    }
    if (ftaEntries.length > 0) {
      await db.cgFtaCache.bulkAdd(ftaEntries);
    }
  }

  async function fetchAndCacheLpiControls(hsCodes: string[]): Promise<void> {
    // Filter out codes that already have valid cache
    const codesToFetch: string[] = [];
    for (const code of hsCodes) {
      const cached = await db.cgLpiCache.where("hsCode").equals(code).first();
      if (!cached || !isCacheValid(cached.cachedAt, LPI_CACHE_TTL_MS)) {
        codesToFetch.push(code);
      }
    }

    if (codesToFetch.length === 0) return;

    // LPI data comes from the same /hs/lookup endpoint (embedded in response)
    const results = await apiClient.hsLookup(codesToFetch);
    const lpiEntries: CgLpiCache[] = [];
    const now = new Date().toISOString();

    for (const result of results) {
      if (result.found && result.lpiAlerts) {
        for (const alert of result.lpiAlerts) {
          lpiEntries.push({
            hsCode: result.code,
            controlType: alert.controlType,
            agencyCode: alert.agencyCode,
            agencyNameTh: alert.agencyNameTh,
            agencyNameEn: alert.agencyNameEn,
            requirementTh: alert.requirementTh,
            requirementEn: alert.requirementEn,
            appliesTo: alert.appliesTo,
            sourceUrl: alert.sourceUrl,
            cachedAt: now,
          });
        }
      }
    }

    // Clear old entries for these codes, then add new
    for (const code of codesToFetch) {
      await db.cgLpiCache.where("hsCode").equals(code).delete();
    }
    if (lpiEntries.length > 0) {
      await db.cgLpiCache.bulkAdd(lpiEntries);
    }
  }

  async function editItem(
    localId: number,
    field: keyof CgDeclarationItem,
    value: string
  ): Promise<void> {
    const existing = await db.cgDeclarationItems.get(localId);
    if (!existing) return;

    // ถ้าค่าเท่าเดิม ไม่ต้องเปลี่ยน editStatus
    if (String(existing[field] ?? "") === value) return;

    const before = { [field]: existing[field] };

    await db.cgDeclarationItems.update(localId, {
      [field]: value,
      editStatus: "EDITED",
    });

    await db.cgAuditLogs.add({
      declarationLocalId: existing.declarationLocalId,
      action: "ITEM_EDITED",
      snapshotBefore: before,
      snapshotAfter: { [field]: value },
      source: "MANUAL",
      timestamp: new Date().toISOString(),
      syncStatus: "LOCAL_ONLY",
    });
  }

  async function confirmItem(localId: number): Promise<void> {
    await db.cgDeclarationItems.update(localId, {
      isConfirmed: true,
      editStatus: "CONFIRMED",
    });

    await db.cgAuditLogs.add({
      declarationLocalId,
      action: "ITEM_CONFIRMED",
      snapshotBefore: null,
      snapshotAfter: { localId },
      source: "MANUAL",
      timestamp: new Date().toISOString(),
      syncStatus: "LOCAL_ONLY",
    });
  }

  async function confirmAll(): Promise<number> {
    const unconfirmed = items.filter((i) => !i.isConfirmed);
    const ids = unconfirmed.map((i) => i.localId!);
    if (ids.length === 0) return 0;

    await db.cgDeclarationItems
      .where("localId")
      .anyOf(ids)
      .modify({ isConfirmed: true, editStatus: "CONFIRMED" });

    await db.cgAuditLogs.add({
      declarationLocalId,
      action: "BULK_CONFIRM",
      snapshotBefore: null,
      snapshotAfter: { confirmedCount: ids.length, itemIds: ids },
      source: "EXTENSION",
      timestamp: new Date().toISOString(),
      syncStatus: "LOCAL_ONLY",
    });

    return ids.length;
  }

  async function clearItems(): Promise<void> {
    await db.cgDeclarationItems
      .where("declarationLocalId")
      .equals(declarationLocalId)
      .delete();
  }

  return {
    items,
    unconfirmedCount,
    saveExtractedItems,
    editItem,
    confirmItem,
    confirmAll,
    clearItems,
  };
}

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { CgDeclarationItem, ExtractedLineItem } from "@/types";

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

  const goldCount = items.filter(
    (i) =>
      i.confidence != null &&
      i.confidence > 0.9 &&
      i.editStatus !== "EDITED" &&
      !i.isConfirmed
  ).length;

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
  }

  async function editItem(
    localId: number,
    field: keyof CgDeclarationItem,
    value: string
  ): Promise<void> {
    const existing = await db.cgDeclarationItems.get(localId);
    if (!existing) return;

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

  async function confirmAllGold(): Promise<number> {
    const goldItems = items.filter(
      (i) =>
        i.confidence != null &&
        i.confidence > 0.9 &&
        i.editStatus !== "EDITED" &&
        !i.isConfirmed
    );

    const ids = goldItems.map((i) => i.localId!);
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
    goldCount,
    saveExtractedItems,
    editItem,
    confirmAllGold,
    clearItems,
  };
}

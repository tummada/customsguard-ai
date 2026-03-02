import { useState, useCallback } from "react";
import PdfDropZone from "./PdfDropZone";
import LineItemTable from "./LineItemTable";
import SettingsDialog from "./SettingsDialog";
import { useScanItems } from "../hooks/useScanItems";
import type { ScanPdfResponse, CgDeclarationItem } from "@/types";

// Use declarationLocalId = 1 for the current scan session
const CURRENT_DECLARATION_ID = 1;

export default function ScanPanel() {
  const [pages, setPages] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    items,
    unconfirmedCount,
    saveExtractedItems,
    editItem,
    confirmItem,
    confirmAll,
    clearItems,
  } = useScanItems(CURRENT_DECLARATION_ID);

  const confirmedCount = items.filter((i) => i.isConfirmed).length;
  const hasConfirmed = confirmedCount > 0;

  const handlePagesReady = useCallback((newPages: string[]) => {
    setPages(newPages);
    setScanError("");
  }, []);

  const handleScan = async () => {
    if (pages.length === 0) return;

    setScanning(true);
    setScanError("");

    try {
      // Clear previous items before new scan
      await clearItems();

      const response: ScanPdfResponse = await chrome.runtime.sendMessage({
        type: "SCAN_PDF",
        payload: { pages, provider: "gemini" },
      });

      if (response.success && response.items) {
        await saveExtractedItems(response.items);
      } else {
        setScanError(response.error || "สแกนไม่สำเร็จ");
      }
    } catch (err) {
      setScanError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ"
      );
    } finally {
      setScanning(false);
    }
  };

  const handleConfirmAll = async () => {
    const count = await confirmAll();
    if (count > 0) {
      console.log(`[VOLLOS] Confirmed ${count} items`);
    }
  };

  const handleClear = async () => {
    await clearItems();
    setPages([]);
    setScanError("");
  };

  const handleFillToForm = async () => {
    const confirmedItems = items.filter((i) => i.isConfirmed);
    if (confirmedItems.length === 0) return;

    // Send the first confirmed item to fill the form
    const first = confirmedItems[0];
    const payload: Record<string, string> = {};
    if (first.hsCode) payload.hsCode = first.hsCode;
    if (first.cifPrice) payload.cifPrice = first.cifPrice;
    if (first.descriptionEn) payload.itemDescription = first.descriptionEn;
    if (first.quantity) payload.itemQuantity = first.quantity;
    if (first.weight) payload.itemWeight = first.weight;

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, {
          type: "MAGIC_FILL",
          payload,
        });
      }
    } catch (err) {
      console.error("[VOLLOS] Fill error:", err);
    }
  };

  const handleEditItem = useCallback(
    (localId: number, field: keyof CgDeclarationItem, value: string) => {
      editItem(localId, field, value);
    },
    [editItem]
  );

  const handleConfirmItem = useCallback(
    (localId: number) => {
      confirmItem(localId);
    },
    [confirmItem]
  );

  return (
    <div className="space-y-3">
      {/* Header with settings */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300">
          Scan & Review
        </h2>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={handleClear}
              className="text-gray-500 hover:text-red-400 text-xs transition-colors"
              title="ล้างข้อมูล"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-gray-500 hover:text-gray-300 text-lg"
            title="Settings"
          >
            &#9881;
          </button>
        </div>
      </div>

      {/* PDF Drop Zone */}
      <PdfDropZone onPagesReady={handlePagesReady} disabled={scanning} />

      {/* Scan Button */}
      {pages.length > 0 && (
        <button
          onClick={handleScan}
          disabled={scanning}
          className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors text-sm"
        >
          {scanning
            ? `กำลังสแกน ${pages.length} หน้า...`
            : `Scan with AI (${pages.length} หน้า)`}
        </button>
      )}

      {/* Error */}
      {scanError && (
        <p className="text-red-400 text-xs">{scanError}</p>
      )}

      {/* Line Items Table */}
      {items.length > 0 && (
        <>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">
                {items.length} รายการ
              </span>
              <span className="text-xs">
                {confirmedCount > 0 && (
                  <span className="text-green-400">{confirmedCount} confirmed</span>
                )}
                {confirmedCount > 0 && unconfirmedCount > 0 && " / "}
                {unconfirmedCount > 0 && (
                  <span className="text-gray-500">{unconfirmedCount} รอ confirm</span>
                )}
              </span>
            </div>
            <LineItemTable
              items={items}
              onEditItem={handleEditItem}
              onConfirmItem={handleConfirmItem}
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Confirm All */}
            {unconfirmedCount > 0 && (
              <button
                onClick={handleConfirmAll}
                className="w-full py-2.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Confirm All ({unconfirmedCount} รายการ)
              </button>
            )}

            {/* Fill to Form */}
            <button
              onClick={handleFillToForm}
              disabled={!hasConfirmed}
              className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors ${
                hasConfirmed
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700"
              }`}
            >
              {hasConfirmed
                ? `Fill to Customs Form (${confirmedCount} รายการ)`
                : "Fill to Customs Form (ยังไม่มีรายการ confirm)"}
            </button>
          </div>
        </>
      )}

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

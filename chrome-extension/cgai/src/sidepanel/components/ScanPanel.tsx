import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLiveQuery } from "dexie-react-hooks";
import PdfDropZone from "./PdfDropZone";
import LineItemTable from "./LineItemTable";
import ExchangeRateBanner from "./ExchangeRateBanner";
import LpiAlertBanner from "./LpiAlertBanner";
import { useScanItems } from "../hooks/useScanItems";
import { useExchangeRates } from "../hooks/useExchangeRates";
import { useAuditRisk } from "../hooks/useAuditRisk";
import { db } from "@/lib/db";
import type { LpiAlert } from "@/lib/api-client";
import type { ScanPdfResponse, CgDeclarationItem, RiskSummary } from "@/types";

// Use declarationLocalId = 1 for the current scan session
const CURRENT_DECLARATION_ID = 1;

// --- Inline AuditSummaryBanner ---
function AuditSummaryBanner({ summary }: { summary: RiskSummary }) {
  const { t } = useTranslation();
  const hasRisk = summary.red > 0 || summary.orange > 0;
  const [expanded, setExpanded] = useState(hasRisk);

  // Auto-expand when risk appears, auto-collapse when cleared
  useEffect(() => {
    setExpanded(hasRisk);
  }, [hasRisk]);

  const total = summary.red + summary.orange + summary.green + summary.gold + summary.blue;
  if (total === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-xs font-semibold text-gray-700">
          {t("banner.auditRisk")}
        </span>
        <div className="flex items-center gap-2 text-xs">
          {summary.red > 0 && (
            <span className="flex items-center gap-0.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              <span className="text-red-600 font-medium">{summary.red}</span>
            </span>
          )}
          {summary.orange > 0 && (
            <span className="flex items-center gap-0.5">
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
              <span className="text-orange-600 font-medium">{summary.orange}</span>
            </span>
          )}
          {summary.green > 0 && (
            <span className="flex items-center gap-0.5">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              <span className="text-green-600 font-medium">{summary.green}</span>
            </span>
          )}
          {summary.gold > 0 && (
            <span className="flex items-center gap-0.5">
              <span className="w-2 h-2 rounded-full bg-brand inline-block" />
              <span className="text-brand font-medium">{summary.gold}</span>
            </span>
          )}
          <span className="text-gray-400 text-[10px]">
            {expanded ? "\u25B2" : "\u25BC"}
          </span>
        </div>
      </button>

      {expanded && summary.topFlags.length > 0 && (
        <div className="px-3 pb-2 border-t border-gray-100 pt-1.5 space-y-1">
          {summary.topFlags.map((flag, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs">
              <span className={`mt-0.5 flex-shrink-0 ${
                flag.severity === "error"
                  ? "text-red-500"
                  : flag.severity === "warning"
                    ? "text-amber-500"
                    : "text-gray-400"
              }`}>
                {flag.severity === "error" ? "\u26A0" : flag.severity === "warning" ? "\u26A0" : "\u2139"}
              </span>
              <span className="text-gray-600">{flag.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ScanPanelProps {
  onItemsChange?: (hsCodes: string[]) => void;
  online?: boolean;
}

export default function ScanPanel({ onItemsChange, online = true }: ScanPanelProps) {
  const { t } = useTranslation();
  const [pages, setPages] = useState<string[]>([]);
  const [rawPdfFile, setRawPdfFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const {
    items,
    unconfirmedCount,
    saveExtractedItems,
    editItem,
    confirmItem,
    confirmAll,
    clearItems,
  } = useScanItems(CURRENT_DECLARATION_ID);

  const { rates, loading: ratesLoading, refresh: refreshRates } = useExchangeRates();

  // Audit risk analysis (multi-factor, pulls LPI/FTA from Dexie internally)
  const { riskMap, riskSummary } = useAuditRisk(items);

  // LPI alerts from Dexie cache (reactive via useLiveQuery)
  const lpiAlerts = useLiveQuery(async () => {
    if (items.length === 0) return [];
    const codes = [...new Set(items.map((i) => i.hsCode))];
    const allAlerts: LpiAlert[] = [];
    for (const code of codes) {
      const cached = await db.cgLpiCache.where("hsCode").equals(code).toArray();
      for (const c of cached) {
        allAlerts.push({
          hsCode: c.hsCode,
          controlType: c.controlType,
          agencyCode: c.agencyCode,
          agencyNameTh: c.agencyNameTh,
          agencyNameEn: c.agencyNameEn,
          requirementTh: c.requirementTh,
          requirementEn: c.requirementEn,
          appliesTo: c.appliesTo,
          sourceUrl: c.sourceUrl ?? null,
        });
      }
    }
    return allAlerts;
  }, [items], []);

  const confirmedCount = items.filter((i) => i.isConfirmed).length;
  const hasConfirmed = confirmedCount > 0;

  // Notify parent of HS codes when items change
  useEffect(() => {
    if (onItemsChange) {
      const codes = [...new Set(items.map((i) => i.hsCode))];
      onItemsChange(codes);
    }
  }, [items, onItemsChange]);

  const handlePagesReady = useCallback((newPages: string[], file: File) => {
    setPages(newPages);
    setRawPdfFile(file);
    setScanError("");
  }, []);

  const handleScan = async () => {
    if (pages.length === 0 || !rawPdfFile) return;

    setScanning(true);
    setScanError("");

    try {
      // Clear previous items before new scan
      await clearItems();

      // Convert raw PDF File to base64 data URL for sending via message
      const buffer = await rawPdfFile.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      const pdfDataUrl = `data:application/pdf;base64,${base64}`;

      const response: ScanPdfResponse = await chrome.runtime.sendMessage({
        type: "SCAN_PDF",
        payload: { pdfDataUrl, declarationType: "IMPORT" },
      });

      if (response.success && response.items) {
        await saveExtractedItems(response.items);
      } else {
        setScanError(response.error || t("scan.scanFailed"));
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
    setRawPdfFile(null);
    setScanError("");
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
        <h2 className="text-sm font-semibold text-gray-700">
          {t("scan.title")}
        </h2>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={handleClear}
              className="text-gray-500 hover:text-red-400 text-xs transition-colors"
              title={t("scan.clear")}
            >
              {t("scan.clear")}
            </button>
          )}
        </div>
      </div>

      {/* PDF Drop Zone */}
      <PdfDropZone onPagesReady={handlePagesReady} disabled={scanning} />

      {/* Scan Button */}
      {pages.length > 0 && (
        <button
          onClick={handleScan}
          disabled={scanning || !online}
          className="w-full py-2 px-4 btn-primary rounded-2xl text-sm"
          title={!online ? t("common.offline") : undefined}
        >
          {scanning
            ? `${t("scan.scanning")} ${pages.length} ${t("scan.pages")}...`
            : !online
              ? t("common.offline")
              : `${t("scan.scanButton")} (${pages.length} ${t("scan.pages")})`}
        </button>
      )}

      {/* Error */}
      {scanError && (
        <p className="text-red-500 text-xs">{scanError}</p>
      )}

      {/* Exchange Rate Banner (blue) — always show when items exist */}
      {items.length > 0 && (
        <ExchangeRateBanner
          rates={rates}
          loading={ratesLoading}
          onRefresh={refreshRates}
        />
      )}

      {/* Audit Risk Summary Banner */}
      {items.length > 0 && (
        <AuditSummaryBanner summary={riskSummary} />
      )}

      {/* Line Items Table */}
      {items.length > 0 && (
        <>
          <div className="bg-white rounded-xl border border-brand/10 shadow-gold p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">
                {items.length} {t("scan.items")}
              </span>
              <span className="text-xs">
                {confirmedCount > 0 && (
                  <span className="text-green-600">{confirmedCount} {t("scan.confirmed")}</span>
                )}
                {confirmedCount > 0 && unconfirmedCount > 0 && " / "}
                {unconfirmedCount > 0 && (
                  <span className="text-gray-500">{unconfirmedCount} {t("scan.waitConfirm")}</span>
                )}
              </span>
            </div>
            <LineItemTable
              items={items}
              riskMap={riskMap}
              onEditItem={handleEditItem}
              onConfirmItem={handleConfirmItem}
            />
          </div>

          {/* LPI Alert Banner (amber) — below table */}
          {lpiAlerts.length > 0 && (
            <LpiAlertBanner alerts={lpiAlerts} />
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Confirm All */}
            {unconfirmedCount > 0 && (
              <button
                onClick={handleConfirmAll}
                className="w-full py-2.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-2xl transition-colors"
              >
                {t("scan.confirmAll")} ({unconfirmedCount} {t("scan.items")})
              </button>
            )}

            {/* Hint to use Magic Fill tab */}
            {hasConfirmed && (
              <p className="text-xs text-center text-gray-400">
                {t("scan.goToMagicFill")}
              </p>
            )}
          </div>
        </>
      )}

    </div>
  );
}

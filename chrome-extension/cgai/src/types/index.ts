// Sync status for entities that sync with the backend PostgreSQL
export type SyncStatus = "LOCAL_ONLY" | "PENDING_SYNC" | "SYNCED" | "CONFLICT";

// Aligned with backend cg_declarations table
export interface CgDeclaration {
  localId?: number; // Auto-increment PK for Dexie
  serverId?: string; // UUID from backend (null = unsynced draft)
  declarationNumber: string;
  declarationType: "IMPORT" | "EXPORT" | "TRANSIT" | "TRANSSHIPMENT";
  status: "DRAFT" | "SUBMITTED" | "COMPLETED" | "CANCELLED";
  totalDuty?: string; // String for Big.js precision
  aiJobId?: string;
  syncStatus: SyncStatus;
  createdAt: string; // ISO timestamp
  updatedAt: string;
}

// Normalized line items (backend stores as JSONB array in cg_declarations.items)
export interface CgDeclarationItem {
  localId?: number;
  declarationLocalId: number; // FK to CgDeclaration.localId
  serverId?: string;
  hsCode: string;
  descriptionTh?: string;
  descriptionEn?: string;
  quantity?: string;
  weight?: string;
  unitPrice?: string;
  cifPrice?: string; // Big.js string for customs-grade precision
  insuranceAmount?: string; // Insurance component of CIF
  freightAmount?: string; // Freight component of CIF
  dutyRate?: string;
  dutyAmount?: string;
  currency?: string;
  vatAmount?: string; // VAT 7% amount
  totalTaxDue?: string; // duty + excise + municipal + VAT
  // AI Scan fields (Feature #2 & #5)
  confidence?: number; // 0.0-1.0 from AI extraction
  aiReason?: string; // AI explanation when confidence is low
  isConfirmed?: boolean; // true after user/bulk confirm
  editStatus?: "AI_EXTRACTED" | "EDITED" | "CONFIRMED";
  sourcePageIndex?: number; // which PDF page this item came from
}

export type EditStatus = "AI_EXTRACTED" | "EDITED" | "CONFIRMED";

// Cached from backend API GET /v1/customsguard/hs-codes
export interface CgHsCodeCache {
  code: string; // PK - HS code e.g. "8471.30.10"
  descriptionTh: string;
  descriptionEn: string;
  dutyRate: string;
  category: string;
  aiConfidence?: number;
  cachedAt: string; // ISO timestamp for cache invalidation
}

// Cached FTA rates from backend HS lookup
export interface CgFtaCache {
  hsCode: string; // PK
  ftaName: string;
  partnerCountry: string;
  formType: string | null;
  preferentialRate: number;
  savingPercent: number;
  conditions: string | null;
  sourceUrl?: string | null;
  cachedAt: string; // ISO timestamp for cache invalidation
}

// Cached RAG search results
export interface CgRagCache {
  localId?: number; // Auto-increment PK
  query: string; // Search query (indexed)
  answer: string;
  sources: unknown[];
  processingTimeMs: number;
  cachedAt: string; // ISO timestamp for cache invalidation
}

// Cached LPI controls from backend HS lookup
export interface CgLpiCache {
  hsCode: string; // PK
  controlType: string;
  agencyCode: string;
  agencyNameTh: string;
  agencyNameEn: string;
  requirementTh: string;
  requirementEn: string;
  appliesTo: string;
  sourceUrl?: string | null;
  cachedAt: string; // ISO timestamp for cache invalidation
}

// Cached exchange rates from backend
export interface CgExchangeRateCache {
  currencyCode: string; // PK
  currencyName: string;
  midRate: number;
  exportRate?: number | null;
  effectiveDate: string;
  source: string;
  cachedAt: string; // ISO timestamp for cache invalidation
}

// Snapshot-based audit log for Liability Shield
export interface CgAuditLog {
  localId?: number;
  declarationLocalId: number;
  action: AuditAction;
  snapshotBefore: Record<string, unknown> | null;
  snapshotAfter: Record<string, unknown> | null;
  source: "EXTENSION" | "MAGIC_FILL" | "MANUAL";
  timestamp: string; // ISO timestamp
  syncStatus: SyncStatus;
}

export type AuditAction =
  | "DECLARATION_CREATED"
  | "DECLARATION_UPDATED"
  | "FIELD_FILLED"
  | "HS_CODE_CHANGED"
  | "FORM_SUBMITTED"
  | "ITEM_ADDED"
  | "ITEM_REMOVED"
  | "AI_SCAN_STARTED"
  | "AI_SCAN_COMPLETED"
  | "ITEM_CONFIRMED"
  | "ITEM_EDITED"
  | "BULK_CONFIRM";

// Sync metadata
export interface SyncState {
  key: string; // e.g. "lastSync", "tenantInfo", "featureAccess"
  value: unknown;
  updatedAt: string;
}

// Message types for chrome.runtime messaging
export interface MagicFillMessage {
  type: "MAGIC_FILL";
  payload: Record<string, string>;
}

export interface MagicFillResponse {
  success: boolean;
  filledCount?: number;
  error?: string;
}

// --- Feature #2: Universal Scan (via Backend API) ---

export interface ScanPdfMessage {
  type: "SCAN_PDF";
  payload: {
    pdfDataUrl: string; // Base64 data-URL of the raw PDF file
    declarationType: "IMPORT" | "EXPORT" | "TRANSIT" | "TRANSSHIPMENT";
  };
}

export interface ScanPdfResponse {
  success: boolean;
  items?: ExtractedLineItem[];
  jobId?: string;
  error?: string;
  quotaExceeded?: unknown;
}

export interface ExtractedLineItem {
  hsCode: string;
  descriptionTh?: string;
  descriptionEn?: string;
  quantity?: string;
  weight?: string;
  unitPrice?: string;
  cifPrice?: string;
  currency?: string;
  confidence: number;
  aiReason?: string;
  sourcePageIndex: number;
}

// --- Auth (JWT via Backend) ---

export interface AuthConfigMessage {
  type: "SET_AUTH";
  payload: { baseUrl: string; token: string; tenantId: string };
}

export interface AuthConfigResponse {
  success: boolean;
}

// --- FTA Lookup ---

export interface HsLookupMessage {
  type: "FTA_LOOKUP";
  payload: { codes: string[]; originCountry?: string };
}

export interface HsLookupResponseMsg {
  success: boolean;
  results?: unknown[];
  error?: string;
}

// --- RAG Search ---

export interface RagSearchMessage {
  type: "RAG_SEARCH";
  payload: { query: string };
}

export interface RagSearchResponseMsg {
  success: boolean;
  answer?: string;
  sources?: unknown[];
  processingTimeMs?: number;
  error?: string;
}

// --- Feature #5: AI Auditor Traffic Light ---

// Traffic Light redesign: 5 confidence levels + blue (edited) + confirmed (checkmark)
export type TrafficLightColor = "darkGreen" | "green" | "yellow" | "orange" | "red" | "blue";

/** @deprecated Use computeAuditRisk() instead */
export function getTrafficColor(
  item: CgDeclarationItem,
): TrafficLightColor {
  if (item.editStatus === "EDITED") return "blue";
  const c = item.confidence ?? 0;
  if (c >= 0.95) return "darkGreen";
  if (c >= 0.90) return "green";
  if (c >= 0.80) return "yellow";
  if (c >= 0.70) return "orange";
  return "red";
}

// --- Feature #6: AI Audit Traffic Light (Multi-Factor) ---

export type RiskFlagType =
  | "HS_NOT_FOUND"
  | "LOW_CONFIDENCE"
  | "MISSING_VALUES"
  | "LPI_REQUIRED"
  | "HIGH_DUTY"
  | "USER_EDITED"
  | "FTA_SAVINGS";

export interface RiskFlag {
  type: RiskFlagType;
  severity: "error" | "warning" | "info";
  message: string;
}

export interface AuditRisk {
  color: TrafficLightColor;
  score: number; // 0.0 (safe) - 1.0 (high risk)
  flags: RiskFlag[];
  summary: string;
}

export interface RiskSummary {
  red: number;
  orange: number;
  yellow: number;
  green: number;
  darkGreen: number;
  blue: number;
  confirmed: number;
  topFlags: RiskFlag[];
}

export function computeAuditRisk(
  item: CgDeclarationItem,
  lpiAlerts: CgLpiCache[],
  ftaRates: CgFtaCache[]
): AuditRisk {
  const flags: RiskFlag[] = [];

  // Step 1: Override — CONFIRMED → use checkmark (handled by TrafficLight component)
  if (item.editStatus === "CONFIRMED" || item.isConfirmed) {
    return { color: "green", score: 0, flags: [], summary: "ยืนยันแล้ว", confirmed: true } as AuditRisk & { confirmed: boolean };
  }
  // EDITED → blue
  if (item.editStatus === "EDITED") {
    return {
      color: "blue",
      score: 0,
      flags: [{ type: "USER_EDITED", severity: "info", message: "แก้ไขโดยผู้ใช้" }],
      summary: "แก้ไขโดยผู้ใช้",
    };
  }

  // Step 2: Confidence → determines circle color (5 levels)
  const confidence = item.confidence ?? 0;
  let color: TrafficLightColor;
  if (confidence >= 0.95) color = "darkGreen";
  else if (confidence >= 0.90) color = "green";
  else if (confidence >= 0.80) color = "yellow";
  else if (confidence >= 0.70) color = "orange";
  else color = "red";

  // Step 3: Alert badges (separate from confidence color)
  const hsNotFound =
    confidence <= 0.1 && item.aiReason && item.aiReason.includes("ไม่พบ");

  if (hsNotFound) {
    flags.push({
      type: "HS_NOT_FOUND",
      severity: "error",
      message: "HS Code ไม่พบในฐานข้อมูล",
    });
  }

  // Missing values alert
  const cifNum = item.cifPrice ? parseFloat(item.cifPrice) : 0;
  if (cifNum <= 0 || !item.quantity || !item.weight) {
    const missing: string[] = [];
    if (cifNum <= 0) missing.push("CIF Price");
    if (!item.quantity) missing.push("Quantity");
    if (!item.weight) missing.push("Weight");
    flags.push({
      type: "MISSING_VALUES",
      severity: "error",
      message: `ข้อมูลไม่ครบ: ${missing.join(", ")}`,
    });
  }

  // LPI alerts
  const lpiCount = lpiAlerts.length;
  if (lpiCount >= 2) {
    flags.push({
      type: "LPI_REQUIRED",
      severity: "warning",
      message: `ต้องมีใบอนุญาต ${lpiCount} หน่วยงาน`,
    });
  } else if (lpiCount === 1) {
    flags.push({
      type: "LPI_REQUIRED",
      severity: "warning",
      message: `ต้องมีใบอนุญาต (${lpiAlerts[0].agencyNameTh})`,
    });
  }

  // High duty rate alert
  const maxBaseRate = ftaRates.reduce((max, r) => {
    const base = r.preferentialRate + r.savingPercent;
    return base > max ? base : max;
  }, 0);
  if (maxBaseRate >= 30) {
    flags.push({
      type: "HIGH_DUTY",
      severity: "warning",
      message: `อัตราอากรสูง (${maxBaseRate}%) — ตรวจสอบเข้ม`,
    });
  }

  // FTA savings — good news badge
  const bestSaving = ftaRates.reduce((max, r) => r.savingPercent > max ? r.savingPercent : max, 0);
  if (bestSaving > 0) {
    const bestFta = ftaRates.find((r) => r.savingPercent === bestSaving);
    flags.push({
      type: "FTA_SAVINGS",
      severity: "info",
      message: `ใช้ FTA ${bestFta?.ftaName} ประหยัดอากร ${bestSaving}%`,
    });
  }

  // Score for summary (higher = more alerts)
  const errorCount = flags.filter((f) => f.severity === "error").length;
  const warnCount = flags.filter((f) => f.severity === "warning").length;
  const score = Math.min(errorCount * 0.3 + warnCount * 0.15, 1.0);

  const summary = errorCount > 0
    ? "มีปัญหาต้องแก้ไข"
    : warnCount > 0
      ? "มีข้อควรระวัง"
      : bestSaving > 0
        ? "ผ่าน — มี FTA ประหยัดอากร"
        : "ผ่าน";

  return { color, score, flags, summary };
}

// Union type for all background messages
export type BackgroundMessage =
  | ScanPdfMessage
  | AuthConfigMessage
  | HsLookupMessage
  | RagSearchMessage;

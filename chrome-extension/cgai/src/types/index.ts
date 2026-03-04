// Sync status for entities that sync with the backend PostgreSQL
export type SyncStatus = "LOCAL_ONLY" | "PENDING_SYNC" | "SYNCED" | "CONFLICT";

// Aligned with backend cg_declarations table
export interface CgDeclaration {
  localId?: number; // Auto-increment PK for Dexie
  serverId?: string; // UUID from backend (null = unsynced draft)
  declarationNumber: string;
  declarationType: "IMPORT" | "EXPORT";
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
  dutyRate?: string;
  dutyAmount?: string;
  currency?: string;
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
    declarationType: "IMPORT" | "EXPORT";
  };
}

export interface ScanPdfResponse {
  success: boolean;
  items?: ExtractedLineItem[];
  jobId?: string;
  error?: string;
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

export type TrafficLightColor = "green" | "orange" | "red" | "blue" | "gold";

/** @deprecated Use computeAuditRisk() instead for multi-factor analysis */
export function getTrafficColor(
  item: CgDeclarationItem,
  ftaAvailable?: boolean
): TrafficLightColor {
  if (item.editStatus === "CONFIRMED") return "gold";
  if (item.editStatus === "EDITED") return "blue";
  if (ftaAvailable) return "gold";
  if (item.confidence == null) return "red";
  if (item.confidence > 0.9) return "green";
  if (item.confidence >= 0.6) return "orange";
  return "red";
}

// --- Feature #6: AI Audit Traffic Light (Multi-Factor) ---

export type RiskFlagType =
  | "HS_NOT_FOUND"
  | "LOW_CONFIDENCE"
  | "MISSING_VALUES"
  | "LPI_REQUIRED"
  | "HIGH_DUTY"
  | "USER_EDITED";

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
  green: number;
  gold: number;
  blue: number;
  topFlags: RiskFlag[];
}

export function computeAuditRisk(
  item: CgDeclarationItem,
  lpiAlerts: CgLpiCache[],
  ftaRates: CgFtaCache[]
): AuditRisk {
  const flags: RiskFlag[] = [];

  // Step 1: Override — CONFIRMED or EDITED
  if (item.editStatus === "CONFIRMED" || item.isConfirmed) {
    return { color: "gold", score: 0, flags: [], summary: "ยืนยันแล้ว" };
  }
  if (item.editStatus === "EDITED") {
    return {
      color: "blue",
      score: 0,
      flags: [{ type: "USER_EDITED", severity: "info", message: "แก้ไขโดยผู้ใช้" }],
      summary: "แก้ไขโดยผู้ใช้",
    };
  }

  // Step 2: Critical flags → RED immediately
  const confidence = item.confidence ?? 0;
  const hsNotFound =
    confidence <= 0.1 && item.aiReason && item.aiReason.includes("ไม่พบ");

  if (hsNotFound) {
    flags.push({
      type: "HS_NOT_FOUND",
      severity: "error",
      message: "HS Code ไม่พบในฐานข้อมูล",
    });
    return { color: "red", score: 1.0, flags, summary: "HS Code ไม่พบ" };
  }

  if (confidence < 0.6) {
    flags.push({
      type: "LOW_CONFIDENCE",
      severity: "error",
      message: `ความมั่นใจต่ำ (${Math.round(confidence * 100)}%)`,
    });
    return {
      color: "red",
      score: 1.0,
      flags,
      summary: "ความมั่นใจต่ำ",
    };
  }

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
    return {
      color: "red",
      score: 1.0,
      flags,
      summary: "ข้อมูลไม่ครบ",
    };
  }

  // Step 3: Additive scoring for non-critical
  let score = 0;

  const lpiCount = lpiAlerts.length;
  if (lpiCount >= 2) {
    score += 0.3;
    flags.push({
      type: "LPI_REQUIRED",
      severity: "warning",
      message: `ต้องมีใบอนุญาต ${lpiCount} หน่วยงาน`,
    });
  } else if (lpiCount === 1) {
    score += 0.15;
    flags.push({
      type: "LPI_REQUIRED",
      severity: "warning",
      message: `ต้องมีใบอนุญาต (${lpiAlerts[0].agencyNameTh})`,
    });
  }

  // Check base duty rate from FTA data
  const maxBaseRate = ftaRates.reduce((max, r) => {
    const base = r.preferentialRate + r.savingPercent;
    return base > max ? base : max;
  }, 0);
  if (maxBaseRate >= 30) {
    score += 0.15;
    flags.push({
      type: "HIGH_DUTY",
      severity: "info",
      message: `อัตราอากรสูง (${maxBaseRate}%) — ตรวจสอบเข้ม`,
    });
  }

  if (confidence >= 0.6 && confidence < 0.8) {
    score += 0.1;
    flags.push({
      type: "LOW_CONFIDENCE",
      severity: "info",
      message: `ความมั่นใจปานกลาง (${Math.round(confidence * 100)}%)`,
    });
  }

  // Step 4: Color from score
  const color: TrafficLightColor = score >= 0.4 ? "orange" : "green";
  const summary =
    color === "orange"
      ? "ความเสี่ยงปานกลาง"
      : flags.length > 0
        ? "ผ่าน — มีข้อสังเกต"
        : "ผ่าน";

  return { color, score: Math.min(score, 1.0), flags, summary };
}

// Union type for all background messages
export type BackgroundMessage =
  | ScanPdfMessage
  | AuthConfigMessage
  | HsLookupMessage
  | RagSearchMessage;

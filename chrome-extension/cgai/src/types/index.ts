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

export function getTrafficColor(
  item: CgDeclarationItem,
  ftaAvailable?: boolean
): TrafficLightColor {
  if (item.editStatus === "EDITED") return "blue";
  if (ftaAvailable) return "gold";
  if (item.confidence == null) return "red";
  if (item.confidence > 0.9) return "green";
  if (item.confidence >= 0.6) return "orange";
  return "red";
}

// Union type for all background messages
export type BackgroundMessage =
  | ScanPdfMessage
  | AuthConfigMessage
  | HsLookupMessage
  | RagSearchMessage;

import Dexie, { type EntityTable } from "dexie";
import type {
  CgDeclaration,
  CgDeclarationItem,
  CgHsCodeCache,
  CgAuditLog,
  SyncState,
} from "@/types";

// Singleton map: one Dexie instance per tenant (tenant isolation at DB level)
const instances = new Map<string, CustomsGuardDB>();

class CustomsGuardDB extends Dexie {
  cgDeclarations!: EntityTable<CgDeclaration, "localId">;
  cgDeclarationItems!: EntityTable<CgDeclarationItem, "localId">;
  cgHsCodesCache!: EntityTable<CgHsCodeCache, "code">;
  cgAuditLogs!: EntityTable<CgAuditLog, "localId">;
  syncState!: EntityTable<SyncState, "key">;

  constructor(tenantId: string) {
    super(`CustomsGuard_${tenantId}`);

    this.version(1).stores({
      cgDeclarations:
        "++localId, serverId, declarationNumber, status, syncStatus",
      cgDeclarationItems: "++localId, declarationLocalId, hsCode",
      cgHsCodesCache: "code, descriptionTh, category",
      cgAuditLogs: "++localId, declarationLocalId, timestamp, syncStatus",
      syncState: "key",
    });

    // v2: Add indexes for AI Auditor traffic-light queries
    this.version(2).stores({
      cgDeclarationItems:
        "++localId, declarationLocalId, hsCode, editStatus, isConfirmed",
    });

    // v3: Add FTA and RAG cache tables for offline-first
    this.version(3).stores({
      cgDeclarationItems:
        "++localId, declarationLocalId, hsCode, editStatus, isConfirmed",
      cgFtaCache: "hsCode, ftaName, cachedAt",
      cgRagCache: "++localId, query, cachedAt",
    });
  }
}

// Get or create a tenant-scoped DB instance (Singleton per tenant)
export function getDB(tenantId: string): CustomsGuardDB {
  let db = instances.get(tenantId);
  if (!db) {
    db = new CustomsGuardDB(tenantId);
    instances.set(tenantId, db);
  }
  return db;
}

// Default tenant for development/mock
const DEV_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export const db = getDB(DEV_TENANT_ID);

export type { CustomsGuardDB };

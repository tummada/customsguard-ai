import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { CgDeclarationItem, AuditRisk, RiskSummary, RiskFlag } from "@/types";
import { computeAuditRisk } from "@/types";

interface UseAuditRiskResult {
  riskMap: Map<number, AuditRisk>;
  riskSummary: RiskSummary;
}

export function useAuditRisk(items: CgDeclarationItem[]): UseAuditRiskResult {
  const hsCodes = useMemo(
    () => [...new Set(items.map((i) => i.hsCode))],
    [items]
  );

  // Reactive Dexie queries for LPI and FTA caches
  const lpiRecords = useLiveQuery(
    async () => {
      if (hsCodes.length === 0) return [];
      return db.cgLpiCache.where("hsCode").anyOf(hsCodes).toArray();
    },
    [hsCodes],
    []
  );

  const ftaRecords = useLiveQuery(
    async () => {
      if (hsCodes.length === 0) return [];
      return db.cgFtaCache.where("hsCode").anyOf(hsCodes).toArray();
    },
    [hsCodes],
    []
  );

  // Compute risk per item
  const riskMap = useMemo(() => {
    const map = new Map<number, AuditRisk>();
    for (const item of items) {
      if (item.localId == null) continue;
      const itemLpi = lpiRecords.filter((l) => l.hsCode === item.hsCode);
      const itemFta = ftaRecords.filter((f) => f.hsCode === item.hsCode);
      map.set(item.localId, computeAuditRisk(item, itemLpi, itemFta));
    }
    return map;
  }, [items, lpiRecords, ftaRecords]);

  // Aggregate summary
  const riskSummary = useMemo((): RiskSummary => {
    const counts = { red: 0, orange: 0, green: 0, gold: 0, blue: 0 };
    const flagMap = new Map<string, RiskFlag>();

    for (const risk of riskMap.values()) {
      counts[risk.color]++;
      for (const flag of risk.flags) {
        // Deduplicate by type
        if (!flagMap.has(flag.type)) {
          flagMap.set(flag.type, flag);
        }
      }
    }

    // Sort: error first, then warning, then info
    const severityOrder = { error: 0, warning: 1, info: 2 };
    const topFlags = Array.from(flagMap.values()).sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );

    return { ...counts, topFlags };
  }, [riskMap]);

  return { riskMap, riskSummary };
}

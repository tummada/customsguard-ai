import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/db";
import { apiClient, isCacheValid, EXCHANGE_RATE_CACHE_TTL_MS } from "@/lib/api-client";
import type { ExchangeRate } from "@/lib/api-client";
import type { CgExchangeRateCache } from "@/types";

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      // Check Dexie cache first
      if (!forceRefresh) {
        const cached = await db.cgExchangeRateCache.toArray();
        if (cached.length > 0 && isCacheValid(cached[0].cachedAt, EXCHANGE_RATE_CACHE_TTL_MS)) {
          setRates(cached.map((c) => ({
            currencyCode: c.currencyCode,
            currencyName: c.currencyName,
            midRate: c.midRate,
            exportRate: c.exportRate,
            effectiveDate: c.effectiveDate,
            source: c.source,
          })));
          setLoading(false);
          return;
        }
      }

      // Fetch from API
      if (!apiClient.isConfigured()) {
        // Fall back to cache even if expired
        const cached = await db.cgExchangeRateCache.toArray();
        if (cached.length > 0) {
          setRates(cached.map((c) => ({
            currencyCode: c.currencyCode,
            currencyName: c.currencyName,
            midRate: c.midRate,
            exportRate: c.exportRate,
            effectiveDate: c.effectiveDate,
            source: c.source,
          })));
        }
        setLoading(false);
        return;
      }

      const apiRates = await apiClient.getExchangeRates();
      setRates(apiRates);

      // Cache to Dexie
      const now = new Date().toISOString();
      await db.cgExchangeRateCache.clear();
      const entries: CgExchangeRateCache[] = apiRates.map((r) => ({
        currencyCode: r.currencyCode,
        currencyName: r.currencyName,
        midRate: r.midRate,
        exportRate: r.exportRate,
        effectiveDate: r.effectiveDate,
        source: r.source,
        cachedAt: now,
      }));
      if (entries.length > 0) {
        await db.cgExchangeRateCache.bulkAdd(entries);
      }
    } catch (err) {
      // Fall back to cache on error
      const cached = await db.cgExchangeRateCache.toArray();
      if (cached.length > 0) {
        setRates(cached.map((c) => ({
          currencyCode: c.currencyCode,
          currencyName: c.currencyName,
          midRate: c.midRate,
          exportRate: c.exportRate,
          effectiveDate: c.effectiveDate,
          source: c.source,
        })));
      } else {
        setError(err instanceof Error ? err.message : "ไม่สามารถดึงอัตราแลกเปลี่ยนได้");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  return { rates, loading, error, refresh: () => fetchRates(true) };
}

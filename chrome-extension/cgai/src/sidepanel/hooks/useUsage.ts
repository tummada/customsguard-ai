import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import type { UsageResponse } from "@/lib/api-client";

const USAGE_STORAGE_KEY = "vollos_usage_cache";

export function useUsage() {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!apiClient.isConfigured()) return;
    setLoading(true);
    try {
      const data = await apiClient.fetchUsage();
      setUsage(data);
      // Persist to chrome.storage for cross-tab sync
      chrome.storage.session.set({ [USAGE_STORAGE_KEY]: data }).catch((err) => {
        console.warn("[VOLLOS] Failed to persist usage to storage:", err);
      });
    } catch (err) {
      console.warn("[VOLLOS] Failed to fetch usage:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Cross-tab sync: listen for usage updates from other tabs
  useEffect(() => {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "session" && changes[USAGE_STORAGE_KEY]?.newValue) {
        setUsage(changes[USAGE_STORAGE_KEY].newValue as UsageResponse);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  return { usage, loading, refresh };
}

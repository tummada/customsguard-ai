import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import type { UsageResponse } from "@/lib/api-client";

export function useUsage() {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!apiClient.isConfigured()) return;
    setLoading(true);
    try {
      const data = await apiClient.fetchUsage();
      setUsage(data);
    } catch (err) {
      console.warn("[VOLLOS] Failed to fetch usage:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { usage, loading, refresh };
}

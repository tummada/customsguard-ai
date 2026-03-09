import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted to declare mocks that vi.mock factories can reference
const {
  mockBulkAdd,
  mockAdd,
  mockGet,
  mockUpdate,
  mockModify,
  whereChain,
  mockDb,
  mockApiClient,
} = vi.hoisted(() => {
  const mockBulkAdd = vi.fn().mockResolvedValue(undefined);
  const mockAdd = vi.fn().mockResolvedValue(1);
  const mockGet = vi.fn();
  const mockUpdate = vi.fn().mockResolvedValue(1);
  const mockModify = vi.fn().mockResolvedValue(undefined);

  const whereChain = {
    equals: vi.fn().mockReturnThis(),
    anyOf: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    first: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(0),
    modify: mockModify,
  };

  const mockDb = {
    cgDeclarationItems: {
      bulkAdd: mockBulkAdd,
      add: mockAdd,
      get: mockGet,
      update: mockUpdate,
      where: vi.fn().mockReturnValue(whereChain),
    },
    cgAuditLogs: {
      add: mockAdd,
    },
    cgFtaCache: {
      where: vi.fn().mockReturnValue({ ...whereChain, first: vi.fn().mockResolvedValue(null) }),
      bulkAdd: vi.fn(),
    },
    cgRagCache: {
      where: vi.fn().mockReturnValue({ ...whereChain, first: vi.fn().mockResolvedValue(null) }),
      add: vi.fn(),
    },
    cgLpiCache: {
      where: vi.fn().mockReturnValue({ ...whereChain, first: vi.fn().mockResolvedValue(null) }),
      bulkAdd: vi.fn(),
    },
  };

  const mockApiClient = {
    isConfigured: vi.fn().mockReturnValue(false),
    hsLookup: vi.fn().mockResolvedValue([]),
    ragSearch: vi.fn().mockResolvedValue({ answer: "", sources: [], processingTimeMs: 0 }),
  };

  return { mockBulkAdd, mockAdd, mockGet, mockUpdate, mockModify, whereChain, mockDb, mockApiClient };
});

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: vi.fn((_fn: () => unknown, _deps: unknown[], fallback: unknown) => fallback),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: mockApiClient,
  isCacheValid: vi.fn().mockReturnValue(false),
  FTA_CACHE_TTL_MS: 86400000,
  LPI_CACHE_TTL_MS: 604800000,
  RAG_CACHE_TTL_MS: 43200000,
}));

import { renderHook, act } from "@testing-library/react";
import { useScanItems } from "@/sidepanel/hooks/useScanItems";
import type { ExtractedLineItem } from "@/types";

describe("useScanItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.isConfigured.mockReturnValue(false);
  });

  // ── saveExtractedItems ──

  describe("saveExtractedItems", () => {
    it("saves items to Dexie via bulkAdd", async () => {
      const { result } = renderHook(() => useScanItems(1));

      const extracted: ExtractedLineItem[] = [
        {
          hsCode: "0306.17",
          descriptionTh: "กุ้งแช่แข็ง",
          confidence: 0.95,
          sourcePageIndex: 0,
        },
        {
          hsCode: "8471.30",
          descriptionTh: "คอมพิวเตอร์",
          confidence: 0.88,
          sourcePageIndex: 1,
        },
      ];

      await act(async () => {
        await result.current.saveExtractedItems(extracted);
      });

      expect(mockBulkAdd).toHaveBeenCalledOnce();
      const savedItems = mockBulkAdd.mock.calls[0][0];
      expect(savedItems).toHaveLength(2);
      expect(savedItems[0].hsCode).toBe("0306.17");
      expect(savedItems[0].editStatus).toBe("AI_EXTRACTED");
      expect(savedItems[0].isConfirmed).toBe(false);
      expect(savedItems[0].declarationLocalId).toBe(1);
      expect(savedItems[1].hsCode).toBe("8471.30");
    });

    it("creates AI_SCAN_COMPLETED audit log", async () => {
      const { result } = renderHook(() => useScanItems(1));

      await act(async () => {
        await result.current.saveExtractedItems([
          { hsCode: "0306.17", confidence: 0.9, sourcePageIndex: 0 },
        ]);
      });

      expect(mockAdd).toHaveBeenCalled();
      const auditLog = mockAdd.mock.calls[0][0];
      expect(auditLog.action).toBe("AI_SCAN_COMPLETED");
      expect(auditLog.snapshotAfter.itemCount).toBe(1);
      expect(auditLog.source).toBe("EXTENSION");
    });

    it("does not trigger FTA lookup when apiClient is not configured", async () => {
      mockApiClient.isConfigured.mockReturnValue(false);
      const { result } = renderHook(() => useScanItems(1));

      await act(async () => {
        await result.current.saveExtractedItems([
          { hsCode: "0306.17", confidence: 0.9, sourcePageIndex: 0 },
        ]);
      });

      expect(mockApiClient.hsLookup).not.toHaveBeenCalled();
    });
  });

  // ── editItem ──

  describe("editItem", () => {
    it("updates field and sets editStatus to EDITED", async () => {
      mockGet.mockResolvedValue({
        localId: 1,
        declarationLocalId: 1,
        hsCode: "0306.17",
        editStatus: "AI_EXTRACTED",
      });

      const { result } = renderHook(() => useScanItems(1));

      await act(async () => {
        await result.current.editItem(1, "hsCode", "0306.18");
      });

      expect(mockDb.cgDeclarationItems.update).toHaveBeenCalledWith(1, {
        hsCode: "0306.18",
        editStatus: "EDITED",
      });
    });

    it("creates ITEM_EDITED audit log with before/after snapshot", async () => {
      mockGet.mockResolvedValue({
        localId: 1,
        declarationLocalId: 1,
        hsCode: "0306.17",
        editStatus: "AI_EXTRACTED",
      });

      const { result } = renderHook(() => useScanItems(1));

      await act(async () => {
        await result.current.editItem(1, "hsCode", "0306.18");
      });

      const auditCall = mockAdd.mock.calls.find(
        (call: any[]) => call[0].action === "ITEM_EDITED"
      );
      expect(auditCall).toBeDefined();
      expect(auditCall![0].snapshotBefore).toEqual({ hsCode: "0306.17" });
      expect(auditCall![0].snapshotAfter).toEqual({ hsCode: "0306.18" });
      expect(auditCall![0].source).toBe("MANUAL");
    });

    it("skips update if value is unchanged", async () => {
      mockGet.mockResolvedValue({
        localId: 1,
        declarationLocalId: 1,
        hsCode: "0306.17",
      });

      const { result } = renderHook(() => useScanItems(1));

      await act(async () => {
        await result.current.editItem(1, "hsCode", "0306.17");
      });

      expect(mockDb.cgDeclarationItems.update).not.toHaveBeenCalled();
    });

    it("does nothing if item not found", async () => {
      mockGet.mockResolvedValue(undefined);

      const { result } = renderHook(() => useScanItems(1));

      await act(async () => {
        await result.current.editItem(999, "hsCode", "0306.18");
      });

      expect(mockDb.cgDeclarationItems.update).not.toHaveBeenCalled();
    });
  });

  // ── confirmItem ──

  describe("confirmItem", () => {
    it("sets isConfirmed and editStatus to CONFIRMED", async () => {
      const { result } = renderHook(() => useScanItems(1));

      await act(async () => {
        await result.current.confirmItem(1);
      });

      expect(mockDb.cgDeclarationItems.update).toHaveBeenCalledWith(1, {
        isConfirmed: true,
        editStatus: "CONFIRMED",
      });
    });

    it("creates ITEM_CONFIRMED audit log", async () => {
      const { result } = renderHook(() => useScanItems(1));

      await act(async () => {
        await result.current.confirmItem(5);
      });

      const auditCall = mockAdd.mock.calls.find(
        (call: any[]) => call[0].action === "ITEM_CONFIRMED"
      );
      expect(auditCall).toBeDefined();
      expect(auditCall![0].snapshotAfter).toEqual({ localId: 5 });
    });
  });

  // ── confirmAll ──

  describe("confirmAll", () => {
    it("returns 0 when no unconfirmed items", async () => {
      const { result } = renderHook(() => useScanItems(1));

      let count: number = -1;
      await act(async () => {
        count = await result.current.confirmAll();
      });

      expect(count).toBe(0);
    });
  });

  // ── clearItems ──

  describe("clearItems", () => {
    it("deletes all items for the declaration", async () => {
      const { result } = renderHook(() => useScanItems(1));

      await act(async () => {
        await result.current.clearItems();
      });

      expect(mockDb.cgDeclarationItems.where).toHaveBeenCalledWith("declarationLocalId");
      expect(whereChain.equals).toHaveBeenCalledWith(1);
      expect(whereChain.delete).toHaveBeenCalled();
    });
  });

  // ── unconfirmedCount ──

  describe("unconfirmedCount", () => {
    it("returns 0 when items array is empty", () => {
      const { result } = renderHook(() => useScanItems(1));
      expect(result.current.unconfirmedCount).toBe(0);
    });
  });
});

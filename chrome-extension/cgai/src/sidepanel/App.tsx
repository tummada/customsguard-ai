import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { apiClient } from "@/lib/api-client";
import ScanPanel from "./components/ScanPanel";
import ChatPanel from "./components/ChatPanel";

type FillStatus = "idle" | "filling" | "success" | "error";
type Tab = "magic-fill" | "scan-review" | "chat";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("scan-review");
  const [status, setStatus] = useState<FillStatus>("idle");
  const [message, setMessage] = useState("");
  const [dbReady, setDbReady] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [scannedHsCodes, setScannedHsCodes] = useState<string[]>([]);

  useEffect(() => {
    db.open()
      .then(() => setDbReady(true))
      .catch((err) => console.error("[VOLLOS] DB open failed:", err));

    apiClient.loadConfig().then((loaded) => setBackendConnected(loaded));
  }, []);

  const handleTestFill = async () => {
    setStatus("filling");
    setMessage("");

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) {
        throw new Error("ไม่พบแท็บที่ใช้งานอยู่");
      }

      const mockData = {
        declarationNumber: "A-MOCK-2026-001234",
        hsCode: "8471.30.10",
        cifPrice: "125750.50",
        itemDescription: "Notebook Computer 14 inch",
        itemQuantity: "50",
        itemWeight: "112.500",
      };

      if (dbReady) {
        await db.cgAuditLogs.add({
          declarationLocalId: 0,
          action: "FIELD_FILLED",
          snapshotBefore: null,
          snapshotAfter: mockData,
          source: "MAGIC_FILL",
          timestamp: new Date().toISOString(),
          syncStatus: "LOCAL_ONLY",
        });
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "MAGIC_FILL",
        payload: mockData,
      });

      if (response?.success) {
        setStatus("success");
        setMessage(`กรอกสำเร็จ ${response.filledCount} ช่อง (+ iFrame fields)`);
      } else {
        setStatus("error");
        setMessage(response?.error || "ไม่สามารถกรอกข้อมูลได้");
      }
    } catch (err) {
      setStatus("error");
      const raw = err instanceof Error ? err.message : "";
      if (raw.includes("Receiving end does not exist") || raw.includes("Could not establish connection")) {
        setMessage("ไม่สามารถเชื่อมต่อกับหน้าเว็บได้ — กรุณาเปิดหน้าใบขนสินค้าก่อนกดปุ่มนี้");
      } else {
        setMessage(raw || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ");
      }
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand">VOLLOS</h1>
            <p className="text-xs text-gray-500">Customs Guard AI</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendConnected ? "bg-green-400" : "bg-gray-300"
                }`}
              />
              <span className="text-xs text-gray-500">
                {backendConnected ? "API" : "Offline"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  dbReady ? "bg-green-400" : "bg-yellow-400"
                }`}
              />
              <span className="text-xs text-gray-500">
                {dbReady ? "DB" : "..."}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-4">
        <button
          onClick={() => setActiveTab("magic-fill")}
          className={`py-2 px-3 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "magic-fill"
              ? "border-brand text-brand"
              : "border-transparent text-gray-500 hover:text-gray-600"
          }`}
        >
          Magic Fill
        </button>
        <button
          onClick={() => setActiveTab("scan-review")}
          className={`py-2 px-3 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "scan-review"
              ? "border-brand text-brand"
              : "border-transparent text-gray-500 hover:text-gray-600"
          }`}
        >
          Scan & Review
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`py-2 px-3 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "chat"
              ? "border-brand text-brand"
              : "border-transparent text-gray-500 hover:text-gray-600"
          }`}
        >
          Chat
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === "magic-fill" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-brand/10 shadow-gold">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Magic Fill
              </h2>
              <button
                onClick={handleTestFill}
                disabled={status === "filling"}
                className="w-full py-2 px-4 btn-primary rounded-2xl text-sm"
              >
                {status === "filling" ? "กำลังกรอก..." : "Test Fill on Mock"}
              </button>

              {message && (
                <p
                  className={`mt-2 text-sm ${
                    status === "success" ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {message}
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "scan-review" && (
          <ScanPanel onAuthChange={setBackendConnected} onItemsChange={setScannedHsCodes} />
        )}

        {activeTab === "chat" && <ChatPanel activeHsCodes={scannedHsCodes} />}
      </div>
    </div>
  );
}

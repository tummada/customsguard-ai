import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Wand2, ScanLine, MessageCircle, Wifi, WifiOff, LogOut } from "lucide-react";
import { Loader2 } from "lucide-react";
import { db } from "@/lib/db";
import { apiClient } from "@/lib/api-client";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginScreen from "./components/LoginScreen";
import ScanPanel from "./components/ScanPanel";
import ChatPanel from "./components/ChatPanel";
import LanguageToggle from "./components/LanguageToggle";

type FillStatus = "idle" | "filling" | "success" | "error";
type Tab = "magic-fill" | "scan-review" | "chat";

function Splash() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold text-brand">VOLLOS</h1>
      <Loader2 className="w-6 h-6 text-brand animate-spin" />
    </div>
  );
}

function AppContent() {
  const { authState, logout } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("scan-review");
  const [status, setStatus] = useState<FillStatus>("idle");
  const [message, setMessage] = useState("");
  const [dbReady, setDbReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [scannedHsCodes, setScannedHsCodes] = useState<string[]>([]);

  useEffect(() => {
    db.open()
      .then(() => setDbReady(true))
      .catch((err) => console.error("[VOLLOS] DB open failed:", err));
  }, []);

  // Network status
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (authState === "loading") return <Splash />;
  if (authState === "login") return <LoginScreen />;

  const handleFill = async () => {
    // Use confirmed scanned items if available
    const confirmedItems = scannedHsCodes.length > 0 ? scannedHsCodes : [];
    if (confirmedItems.length === 0) {
      setStatus("error");
      setMessage(t("magicFill.noData"));
      return;
    }

    setStatus("filling");
    setMessage("");

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) {
        throw new Error(t("magicFill.noTab"));
      }

      // Get first confirmed item data from Dexie
      const items = await db.cgDeclarationItems
        .where("declarationLocalId")
        .equals(1)
        .filter((i) => i.isConfirmed === true)
        .toArray();

      if (items.length === 0) {
        setStatus("error");
        setMessage(t("magicFill.noData"));
        return;
      }

      const first = items[0];
      const payload: Record<string, string> = {};
      if (first.hsCode) payload.hsCode = first.hsCode;
      if (first.cifPrice) payload.cifPrice = first.cifPrice;
      if (first.descriptionEn) payload.itemDescription = first.descriptionEn;
      if (first.quantity) payload.itemQuantity = first.quantity;
      if (first.weight) payload.itemWeight = first.weight;

      if (dbReady) {
        await db.cgAuditLogs.add({
          declarationLocalId: 0,
          action: "FIELD_FILLED",
          snapshotBefore: null,
          snapshotAfter: payload,
          source: "MAGIC_FILL",
          timestamp: new Date().toISOString(),
          syncStatus: "LOCAL_ONLY",
        });
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "MAGIC_FILL",
        payload,
      });

      if (response?.success) {
        setStatus("success");
        setMessage(t("magicFill.success", { count: response.filledCount }));
      } else {
        setStatus("error");
        setMessage(response?.error || t("scan.scanFailed"));
      }
    } catch (err) {
      setStatus("error");
      const raw = err instanceof Error ? err.message : "";
      if (raw.includes("Receiving end does not exist") || raw.includes("Could not establish connection")) {
        setMessage(t("magicFill.cannotConnect"));
      } else {
        setMessage(raw || t("scan.scanFailed"));
      }
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Wand2 }[] = [
    { key: "magic-fill", label: t("tabs.magicFill"), icon: Wand2 },
    { key: "scan-review", label: t("tabs.scanReview"), icon: ScanLine },
    { key: "chat", label: t("tabs.chat"), icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 animate-fadeIn">
      {/* Header */}
      <header className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand">{t("header.appName")}</h1>
            <p className="text-xs text-gray-500">{t("header.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Connection status */}
            <div className="flex items-center gap-1" title={online ? t("header.connected") : t("header.offline")}>
              {online ? (
                <Wifi className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-gray-400" />
              )}
            </div>
            {/* Language toggle */}
            <LanguageToggle />
            {/* Logout */}
            <button
              onClick={logout}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-4">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 py-2 px-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === key
                ? "border-brand text-brand bg-brand/5"
                : "border-transparent text-gray-500 hover:text-gray-600"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === "magic-fill" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-brand/10 shadow-gold">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">
                {t("magicFill.title")}
              </h2>
              <p className="text-xs text-gray-500 mb-3">
                {t("magicFill.description")}
              </p>
              <button
                onClick={handleFill}
                disabled={status === "filling" || scannedHsCodes.length === 0}
                className={`w-full py-2.5 px-4 rounded-2xl text-sm ${
                  scannedHsCodes.length > 0
                    ? "btn-primary"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                }`}
              >
                {status === "filling" ? t("magicFill.filling") : t("magicFill.button")}
              </button>

              {message && (
                <p
                  className={`mt-2 text-xs ${
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
          <ScanPanel onItemsChange={setScannedHsCodes} online={online} />
        )}

        {activeTab === "chat" && <ChatPanel activeHsCodes={scannedHsCodes} />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

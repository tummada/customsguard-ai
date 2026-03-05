import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Mail, Lock } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Hidden dev mode: tap logo 5 times
  const [tapCount, setTapCount] = useState(0);
  const [showDevUrl, setShowDevUrl] = useState(false);
  const [devUrl, setDevUrl] = useState("");

  const handleLogoTap = useCallback(() => {
    const next = tapCount + 1;
    if (next >= 5) {
      setShowDevUrl(true);
      setTapCount(0);
      // Load stored dev URL
      chrome.storage.local.get("devBackendUrl").then((result) => {
        if (result.devBackendUrl) setDevUrl(result.devBackendUrl);
      });
    } else {
      setTapCount(next);
    }
  }, [tapCount]);

  const handleSaveDevUrl = async () => {
    const trimmed = devUrl.trim();
    if (trimmed) {
      await chrome.storage.local.set({ devBackendUrl: trimmed });
    }
  };

  const handleResetDevUrl = async () => {
    await chrome.storage.local.remove("devBackendUrl");
    setDevUrl("");
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim() || loading) return;
    setLoading(true);
    setError("");

    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        setError(t("error.connectionFailed"));
      } else if (err instanceof Error && err.message === "INVALID_CREDENTIALS") {
        setError(t("error.invalidCredentials"));
      } else {
        setError(t("error.connectionFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 animate-fadeIn">
      <div className="w-full max-w-xs space-y-6">
        {/* Logo */}
        <div className="text-center" onClick={handleLogoTap}>
          <img
            src="/icon-128.png"
            alt="VOLLOS"
            className="w-16 h-16 mx-auto mb-2 select-none pointer-events-none"
            draggable={false}
          />
          <h1 className="text-3xl font-bold text-brand select-none cursor-default">VOLLOS</h1>
          <p className="text-xs text-gray-400 mt-1">{t("header.subtitle")}</p>
        </div>

        {/* Login Form */}
        <div className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("login.email")}
              className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus-gold"
              disabled={loading}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("login.password")}
              className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus-gold"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-red-500 text-xs text-center animate-fadeIn">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={!email.trim() || !password.trim() || loading}
            className="w-full py-2.5 btn-primary rounded-xl text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("login.connecting")}
              </>
            ) : (
              t("login.submit")
            )}
          </button>

          <p className="text-center">
            <span className="text-xs text-gray-400 cursor-pointer hover:text-gray-500">
              {t("login.forgotPassword")}
            </span>
          </p>
        </div>

        {/* Hidden Dev URL Override */}
        {showDevUrl && (
          <div className="border border-dashed border-gray-300 rounded-xl p-3 space-y-2 animate-slideUp">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">Dev URL Override</label>
            <input
              type="url"
              value={devUrl}
              onChange={(e) => setDevUrl(e.target.value)}
              placeholder="http://localhost:8080"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus-gold"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveDevUrl}
                className="flex-1 py-1.5 text-[10px] bg-gray-900 text-white rounded-lg hover:bg-gray-700"
              >
                Save
              </button>
              <button
                onClick={handleResetDevUrl}
                className="flex-1 py-1.5 text-[10px] bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
              >
                Reset to Default
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

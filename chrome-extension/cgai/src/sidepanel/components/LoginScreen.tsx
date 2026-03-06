import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginScreen() {
  const { t } = useTranslation();
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      await loginWithGoogle();
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "USER_CANCELLED") {
          // User closed the popup — not an error
          setError("");
        } else if (err.message === "INVALID_CREDENTIALS") {
          setError(t("error.invalidCredentials"));
        } else {
          setError(t("error.connectionFailed"));
        }
      } else {
        setError(t("error.connectionFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 animate-fadeIn">
      <div className="w-full max-w-xs space-y-6">
        {/* Logo */}
        <div className="text-center">
          <img
            src="/icon-128.png"
            alt="VOLLOS"
            className="w-16 h-16 mx-auto mb-2 select-none pointer-events-none"
            draggable={false}
          />
          <h1 className="text-3xl font-bold text-brand select-none cursor-default">VOLLOS</h1>
          <p className="text-xs text-gray-400 mt-1">{t("header.subtitle")}</p>
        </div>

        {/* Google Login */}
        <div className="space-y-3">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("login.connecting")}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t("login.google")}
              </>
            )}
          </button>

          {error && (
            <p className="text-red-500 text-xs text-center animate-fadeIn">{error}</p>
          )}

          <p className="text-center text-[10px] text-gray-400 leading-relaxed">
            {t("login.terms")}
          </p>
        </div>
      </div>
    </div>
  );
}

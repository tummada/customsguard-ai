import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onAuthChange?: (connected: boolean) => void;
}

export default function SettingsDialog({ open, onClose, onAuthChange }: SettingsDialogProps) {
  const [backendUrl, setBackendUrl] = useState("http://localhost:8080");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (open) {
      setConnected(apiClient.isConfigured());
      const config = apiClient.getConfig();
      if (config) {
        setBackendUrl(config.baseUrl);
      }
    }
  }, [open]);

  if (!open) return null;

  const handleLogin = async () => {
    if (!backendUrl.trim() || !email.trim() || !password.trim()) return;
    setSaving(true);
    setError("");

    try {
      // Call backend login endpoint
      const resp = await fetch(`${backendUrl}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!resp.ok) {
        throw new Error(`Login failed (${resp.status})`);
      }

      const data = await resp.json();
      const { accessToken, tenantId } = data;

      // Configure API client
      await apiClient.configure(backendUrl, accessToken, tenantId);

      // Notify background service worker
      await chrome.runtime.sendMessage({
        type: "SET_AUTH",
        payload: { baseUrl: backendUrl, token: accessToken, tenantId },
      });

      setConnected(true);
      onAuthChange?.(true);
      setPassword("");
      setTimeout(onClose, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await apiClient.logout();
    setConnected(false);
    onAuthChange?.(false);
    setEmail("");
    setPassword("");
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-5 w-full max-w-sm">
        <h3 className="text-sm font-semibold text-white mb-4">
          Settings — VOLLOS Backend
        </h3>

        {connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-green-900/30 border border-green-800 rounded p-3">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm text-green-300">Connected</span>
            </div>
            <p className="text-xs text-gray-400">
              Backend: {apiClient.getConfig()?.baseUrl}
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
              >
                Close
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Logout
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <label className="block text-xs text-gray-400 mb-1">Backend URL</label>
              <input
                type="url"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="http://localhost:8080"
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              />
            </div>

            <div className="mb-3">
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              />
            </div>

            <div className="mb-3">
              <label className="block text-xs text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs mb-3">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleLogin}
                disabled={!backendUrl.trim() || !email.trim() || !password.trim() || saving}
                className="flex-1 py-2 text-sm bg-amber-500 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500 text-black font-medium rounded"
              >
                {saving ? "Connecting..." : "Login"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

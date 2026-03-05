import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { apiClient } from "@/lib/api-client";

type AuthState = "loading" | "login" | "ready";

interface AuthContextValue {
  authState: AuthState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [, setLoginError] = useState("");

  useEffect(() => {
    // Register auth expired callback
    apiClient.setOnAuthExpired(() => {
      setAuthState("login");
    });

    // Load config with minimum splash time
    Promise.all([apiClient.loadConfig(), sleep(500)]).then(([loaded]) => {
      setAuthState(loaded ? "ready" : "login");
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoginError("");
    const baseUrl = await apiClient.getBackendUrl();

    const resp = await fetch(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) {
        throw new Error("INVALID_CREDENTIALS");
      }
      throw new Error("CONNECTION_FAILED");
    }

    const data = await resp.json();
    const { accessToken, tenantId } = data;

    await apiClient.configure(accessToken, tenantId);

    // Notify background service worker
    await chrome.runtime.sendMessage({
      type: "SET_AUTH",
      payload: { baseUrl, token: accessToken, tenantId },
    });

    setAuthState("ready");
  }, []);

  const logout = useCallback(async () => {
    await apiClient.logout();
    setAuthState("login");
  }, []);

  return (
    <AuthContext.Provider value={{ authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

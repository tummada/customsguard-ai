import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { apiClient } from "@/lib/api-client";

type AuthState = "loading" | "login" | "ready";

interface AuthContextValue {
  authState: AuthState;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>("loading");

  useEffect(() => {
    apiClient.setOnAuthExpired(() => {
      setAuthState("login");
    });

    Promise.all([apiClient.loadConfig(), sleep(500)]).then(([loaded]) => {
      setAuthState(loaded ? "ready" : "login");
    });
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const redirectUri = chrome.identity.getRedirectURL();
    const nonce = generateNonce();

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "id_token");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("nonce", nonce);
    authUrl.searchParams.set("prompt", "select_account");

    // Open Google consent screen
    const responseUrl = await new Promise<string>((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        { url: authUrl.toString(), interactive: true },
        (callbackUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error("USER_CANCELLED"));
            return;
          }
          if (!callbackUrl) {
            reject(new Error("USER_CANCELLED"));
            return;
          }
          resolve(callbackUrl);
        }
      );
    });

    // Extract id_token from URL fragment
    const hash = new URL(responseUrl.replace("#", "?")).searchParams;
    const idToken = hash.get("id_token");
    if (!idToken) {
      throw new Error("No id_token in response");
    }

    // Send to backend
    const baseUrl = await apiClient.getBackendUrl();
    const resp = await fetch(`${baseUrl}/v1/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
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
    <AuthContext.Provider value={{ authState, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

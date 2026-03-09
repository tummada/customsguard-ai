import React, { Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "@/i18n";
import App from "./App";
import "../styles/global.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[VOLLOS] Uncaught error:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, textAlign: "center" }}>
          <h2 style={{ color: "#c53030", marginBottom: 8 }}>เกิดข้อผิดพลาด</h2>
          <p style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ padding: "8px 16px", background: "#D4AF37", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            ลองใหม่
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

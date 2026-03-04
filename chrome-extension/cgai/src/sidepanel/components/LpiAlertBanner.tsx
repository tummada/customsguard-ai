import { useState } from "react";
import type { LpiAlert } from "@/lib/api-client";

interface LpiAlertBannerProps {
  alerts: LpiAlert[];
}

export default function LpiAlertBanner({ alerts }: LpiAlertBannerProps) {
  const [expandedHs, setExpandedHs] = useState<Set<string>>(new Set());

  if (alerts.length === 0) return null;

  // Group alerts by HS code
  const grouped = new Map<string, LpiAlert[]>();
  for (const alert of alerts) {
    const existing = grouped.get(alert.hsCode) || [];
    existing.push(alert);
    grouped.set(alert.hsCode, existing);
  }

  const toggleExpand = (hsCode: string) => {
    setExpandedHs((prev) => {
      const next = new Set(prev);
      if (next.has(hsCode)) next.delete(hsCode);
      else next.add(hsCode);
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-amber-600 text-sm">&#9888;</span>
        <span className="text-xs font-medium text-amber-700">
          ใบอนุญาต / ของต้องกำกัด (LPI)
        </span>
      </div>

      <div className="space-y-2">
        {Array.from(grouped.entries()).map(([hsCode, hsAlerts]) => {
          const isExpanded = expandedHs.has(hsCode);
          return (
            <div key={hsCode} className="bg-amber-50 rounded-lg border border-amber-100">
              {/* HS code header with agency badges */}
              <button
                onClick={() => toggleExpand(hsCode)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-left"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-mono font-medium text-amber-800">
                    {hsCode}
                  </span>
                  {hsAlerts.map((a, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-200 text-amber-800"
                    >
                      {a.agencyCode}
                    </span>
                  ))}
                </div>
                <span className="text-amber-500 text-xs ml-1">
                  {isExpanded ? "▲" : "▼"}
                </span>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-2 pb-2 space-y-1.5">
                  {hsAlerts.map((alert, i) => (
                    <div
                      key={i}
                      className="bg-white rounded px-2 py-1.5 text-xs border border-amber-100"
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="font-medium text-amber-700">
                          {alert.agencyNameTh}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(alert.agencyCode);
                          }}
                          className="inline-flex items-center px-1 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-700 text-[10px] transition-colors"
                          title={`Copy: ${alert.agencyCode}`}
                        >
                          {alert.agencyCode} &#128203;
                        </button>
                      </div>
                      <p className="text-gray-600 text-[11px]">
                        {alert.requirementTh}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400">
                          {alert.controlType}
                        </span>
                        {alert.sourceUrl && (
                          <a
                            href={alert.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-500 hover:underline text-[10px]"
                          >
                            ดูเพิ่มเติม →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

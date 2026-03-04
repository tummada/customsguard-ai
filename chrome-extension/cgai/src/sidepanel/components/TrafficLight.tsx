import { useState } from "react";
import type { CgDeclarationItem, TrafficLightColor, AuditRisk, RiskFlag } from "@/types";

interface TrafficLightProps {
  item: CgDeclarationItem;
  risk?: AuditRisk;
}

const COLOR_MAP: Record<TrafficLightColor, { bg: string; label: string }> = {
  green: { bg: "bg-green-500", label: "Safe" },
  orange: { bg: "bg-orange-400", label: "Medium Risk" },
  red: { bg: "bg-red-500", label: "High Risk" },
  blue: { bg: "bg-blue-400", label: "Edited" },
  gold: { bg: "bg-brand", label: "Confirmed" },
};

const SEVERITY_ICON: Record<RiskFlag["severity"], string> = {
  error: "\u274C",   // red X
  warning: "\u26A0", // warning triangle
  info: "\u2139",    // info circle
};

const SEVERITY_COLOR: Record<RiskFlag["severity"], string> = {
  error: "text-red-600",
  warning: "text-amber-600",
  info: "text-gray-500",
};

export default function TrafficLight({ item, risk }: TrafficLightProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const color = risk?.color ?? "green";
  const { bg, label } = COLOR_MAP[color];
  const confidenceText =
    item.confidence != null ? `${Math.round(item.confidence * 100)}%` : "N/A";

  return (
    <div className="relative inline-flex items-center">
      <span
        className={`w-3 h-3 rounded-full ${bg} cursor-pointer flex-shrink-0`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      />
      {showTooltip && (
        <div className="absolute left-5 top-0 z-50 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-lg w-56">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-gray-800">{label}</span>
            <span className="text-gray-400">AI {confidenceText}</span>
          </div>

          {/* Risk score bar (only for red/orange) */}
          {risk && (color === "red" || color === "orange") && (
            <div className="mb-1.5">
              <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5">
                <span>Risk</span>
                <span>{Math.round(risk.score * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${color === "red" ? "bg-red-500" : "bg-orange-400"}`}
                  style={{ width: `${Math.round(risk.score * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Flags */}
          {risk && risk.flags.length > 0 && (
            <div className="space-y-1 border-t border-gray-100 pt-1.5 mt-1">
              {risk.flags.map((flag, i) => (
                <div key={i} className={`flex items-start gap-1.5 ${SEVERITY_COLOR[flag.severity]}`}>
                  <span className="text-[10px] mt-0.5 flex-shrink-0">
                    {SEVERITY_ICON[flag.severity]}
                  </span>
                  <span className="text-[11px] leading-tight">{flag.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Fallback for no-risk items */}
          {(!risk || risk.flags.length === 0) && color === "gold" && (
            <p className="text-brand text-[11px]">ยืนยันแล้ว — พร้อมกรอกฟอร์ม</p>
          )}
          {(!risk || risk.flags.length === 0) && color === "green" && (
            <p className="text-green-600 text-[11px]">ผ่านการตรวจสอบ</p>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CgDeclarationItem, TrafficLightColor, AuditRisk, RiskFlag } from "@/types";

interface TrafficLightProps {
  item: CgDeclarationItem;
  risk?: AuditRisk;
}

// Traffic Light redesign: 5 confidence levels + blue (edited)
const COLOR_MAP: Record<TrafficLightColor, { bg: string; labelKey: string }> = {
  darkGreen: { bg: "bg-green-700", labelKey: "traffic.veryHigh" },
  green: { bg: "bg-green-500", labelKey: "traffic.high" },
  yellow: { bg: "bg-yellow-400", labelKey: "traffic.moderate" },
  orange: { bg: "bg-orange-400", labelKey: "traffic.uncertain" },
  red: { bg: "bg-red-500", labelKey: "traffic.unreliable" },
  blue: { bg: "bg-blue-400", labelKey: "traffic.edited" },
};

const SEVERITY_ICON: Record<RiskFlag["severity"], string> = {
  error: "\u274C",
  warning: "\u26A0\uFE0F",
  info: "\uD83D\uDC9A",
};

const SEVERITY_COLOR: Record<RiskFlag["severity"], string> = {
  error: "text-red-600",
  warning: "text-amber-600",
  info: "text-green-600",
};

export default function TrafficLight({ item, risk }: TrafficLightProps) {
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(false);

  // Confirmed items show checkmark instead of colored dot
  const isConfirmed = item.isConfirmed || item.editStatus === "CONFIRMED";

  const color = risk?.color ?? "green";
  const { bg, labelKey } = COLOR_MAP[color];
  const label = t(labelKey, { defaultValue: labelKey });
  const confidenceText =
    item.confidence != null ? `${Math.round(item.confidence * 100)}%` : "N/A";

  // Count alert badges by severity
  const errorFlags = risk?.flags.filter((f) => f.severity === "error") ?? [];
  const warnFlags = risk?.flags.filter((f) => f.severity === "warning") ?? [];
  const infoFlags = risk?.flags.filter((f) => f.severity === "info") ?? [];

  return (
    <div className="relative inline-flex items-center gap-1">
      {/* Part 1: Confidence circle OR checkmark */}
      {isConfirmed ? (
        <span
          className="text-green-600 text-sm cursor-pointer flex-shrink-0"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          title={t("traffic.confirmed", { defaultValue: "ยืนยันแล้ว" })}
        >
          ✅
        </span>
      ) : (
        <span
          className={`w-3 h-3 rounded-full ${bg} cursor-pointer flex-shrink-0`}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        />
      )}

      {/* Part 2: Alert badges (inline, only when present) */}
      {errorFlags.length > 0 && (
        <span className="text-[10px] text-red-500" title={errorFlags.map((f) => f.message).join(", ")}>
          {"\u274C"}
        </span>
      )}
      {warnFlags.length > 0 && (
        <span className="text-[10px] text-amber-500" title={warnFlags.map((f) => f.message).join(", ")}>
          {"\u26A0\uFE0F"}
        </span>
      )}
      {infoFlags.length > 0 && infoFlags.some((f) => f.type === "FTA_SAVINGS") && (
        <span className="text-[10px] text-green-500" title={infoFlags.map((f) => f.message).join(", ")}>
          {"\uD83D\uDC9A"}
        </span>
      )}

      {/* Tooltip on hover */}
      {showTooltip && (
        <div className="absolute left-5 top-0 z-50 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-lg w-56">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-gray-800">
              {isConfirmed ? t("traffic.confirmed", { defaultValue: "ยืนยันแล้ว" }) : label}
            </span>
            <span className="text-gray-400">{t("traffic.ai", { defaultValue: "AI" })} {confidenceText}</span>
          </div>

          {/* Confidence bar */}
          {!isConfirmed && item.confidence != null && (
            <div className="mb-1.5">
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${bg}`}
                  style={{ width: `${Math.round(item.confidence * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Alert flags */}
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

          {/* Fallback messages */}
          {(!risk || risk.flags.length === 0) && isConfirmed && (
            <p className="text-green-600 text-[11px]">{t("traffic.readyToFill", { defaultValue: "พร้อมกรอกใบขน" })}</p>
          )}
          {(!risk || risk.flags.length === 0) && !isConfirmed && (
            <p className="text-green-600 text-[11px]">{t("traffic.passed", { defaultValue: "ผ่าน" })}</p>
          )}
        </div>
      )}
    </div>
  );
}

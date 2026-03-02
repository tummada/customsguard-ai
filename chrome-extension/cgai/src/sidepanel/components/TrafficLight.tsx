import { useState } from "react";
import type { CgDeclarationItem, TrafficLightColor } from "@/types";
import { getTrafficColor } from "@/types";

interface TrafficLightProps {
  item: CgDeclarationItem;
}

const COLOR_MAP: Record<TrafficLightColor, { bg: string; label: string }> = {
  green: { bg: "bg-green-500", label: "High Confidence" },
  orange: { bg: "bg-orange-400", label: "Medium Confidence" },
  red: { bg: "bg-red-500", label: "Low Confidence" },
  blue: { bg: "bg-blue-400", label: "Edited" },
};

export default function TrafficLight({ item }: TrafficLightProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const color = getTrafficColor(item);
  const { bg, label } = COLOR_MAP[color];

  const confidenceText =
    item.confidence != null ? `${Math.round(item.confidence * 100)}%` : "N/A";

  return (
    <div className="relative inline-flex items-center">
      <span
        className={`w-3 h-3 rounded-full ${bg} cursor-pointer`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      />
      {showTooltip && (
        <div className="absolute left-5 top-1/2 -translate-y-1/2 z-50 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-xs whitespace-nowrap shadow-lg">
          <p className="font-semibold">{label} ({confidenceText})</p>
          {color === "red" && item.aiReason && (
            <p className="text-red-300 mt-1">{item.aiReason}</p>
          )}
          {color === "blue" && (
            <p className="text-blue-300 mt-1">แก้ไขโดยผู้ใช้</p>
          )}
        </div>
      )}
    </div>
  );
}

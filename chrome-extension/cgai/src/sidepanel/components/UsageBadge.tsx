import { useTranslation } from "react-i18next";
import type { UsageResponse } from "@/lib/api-client";

interface UsageBadgeProps {
  usage: UsageResponse | null;
}

function getColor(used: number, limit: number): string {
  if (limit === 0) return "text-gray-400";
  const ratio = used / limit;
  if (ratio >= 1) return "text-red-600";
  if (ratio >= 0.8) return "text-orange-500";
  return "text-gray-500";
}

function MiniBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const barColor =
    pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-orange-400" : "bg-brand";

  return (
    <div className="w-10 bg-gray-200 rounded-full h-1 mt-0.5">
      <div
        className={`${barColor} h-1 rounded-full transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function UsageBadge({ usage }: UsageBadgeProps) {
  const { t } = useTranslation();

  if (!usage) return null;

  return (
    <div className="flex items-center gap-3 text-[10px]">
      {/* Scan usage */}
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-0.5">
          <span className={getColor(usage.scan.used, usage.scan.limit)}>
            {t("quota.scan")} {usage.scan.used}/{usage.scan.limit}
          </span>
        </div>
        <MiniBar used={usage.scan.used} limit={usage.scan.limit} />
      </div>

      {/* Chat usage */}
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-0.5">
          <span className={getColor(usage.chat.used, usage.chat.limit)}>
            {t("quota.chat")} {usage.chat.used}/{usage.chat.limit}
          </span>
        </div>
        <MiniBar used={usage.chat.used} limit={usage.chat.limit} />
      </div>
    </div>
  );
}

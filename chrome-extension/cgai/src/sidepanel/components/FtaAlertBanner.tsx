import type { FtaAlert } from "@/lib/api-client";

interface FtaAlertBannerProps {
  alerts: FtaAlert[];
  hsCode: string;
}

export default function FtaAlertBanner({ alerts, hsCode }: FtaAlertBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg p-3 mt-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-emerald-400 text-sm">&#9733;</span>
        <span className="text-xs font-medium text-emerald-300">
          FTA Savings — {hsCode}
        </span>
      </div>
      <div className="space-y-1.5">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-xs bg-emerald-950/50 rounded px-2 py-1.5"
          >
            <div className="text-gray-300">
              <span className="font-medium text-emerald-300">{alert.ftaName}</span>
              {alert.partnerCountry && (
                <span className="text-gray-500 ml-1">({alert.partnerCountry})</span>
              )}
              {alert.formType && (
                <span className="text-gray-500 ml-1">- {alert.formType}</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-emerald-400 font-medium">
                {alert.preferentialRate}%
              </span>
              <span className="text-gray-500 ml-1">
                (save {alert.savingPercent}%)
              </span>
            </div>
          </div>
        ))}
      </div>
      {alerts[0]?.conditions && (
        <p className="text-gray-500 text-xs mt-2 italic">
          {alerts[0].conditions}
        </p>
      )}
    </div>
  );
}

import type { ExchangeRate } from "@/lib/api-client";

interface ExchangeRateBannerProps {
  rates: ExchangeRate[];
  loading: boolean;
  onRefresh: () => void;
}

function formatThaiDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear() + 543; // Buddhist Era
  return `${day}/${month}/${year}`;
}

export default function ExchangeRateBanner({
  rates,
  loading,
  onRefresh,
}: ExchangeRateBannerProps) {
  if (rates.length === 0 && !loading) return null;

  const effectiveDate = rates[0]?.effectiveDate;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-blue-600 text-sm">&#128181;</span>
          <span className="text-xs font-medium text-blue-700">
            อัตราแลกเปลี่ยน
          </span>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-blue-500 hover:text-blue-700 text-[10px] transition-colors disabled:opacity-50"
        >
          {loading ? "กำลังโหลด..." : "&#8635; Refresh"}
        </button>
      </div>

      {/* Rate grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {rates.map((rate) => (
          <div
            key={rate.currencyCode}
            className="bg-white rounded-lg px-2 py-1.5 text-center border border-blue-100"
          >
            <div className="text-[10px] text-gray-500">{rate.currencyCode}</div>
            <div className="text-xs font-medium text-blue-800">
              {rate.midRate.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Effective date and note */}
      <div className="mt-2 space-y-0.5">
        {effectiveDate && (
          <p className="text-[10px] text-blue-600">
            อ้างอิงประกาศกรมศุลกากร ประจำวันที่ {formatThaiDate(effectiveDate)}
          </p>
        )}
        <p className="text-[10px] text-gray-400">
          อัตรากลาง (Mid Rate) — ใช้คำนวณอากรศุลกากร
        </p>
      </div>
    </div>
  );
}

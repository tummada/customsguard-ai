import { useTranslation } from "react-i18next";
import { X, ArrowUpRight } from "lucide-react";
import type { QuotaExceededResponse } from "@/lib/api-client";

const PRICING_URL = "https://vollos.ai/customsguard/pricing";

interface QuotaExceededModalProps {
  quota: QuotaExceededResponse;
  onClose: () => void;
}

export default function QuotaExceededModal({ quota, onClose }: QuotaExceededModalProps) {
  const { t } = useTranslation();

  const handleUpgrade = () => {
    const url = quota.upgradeUrl?.startsWith("http")
      ? quota.upgradeUrl
      : PRICING_URL;

    // Try chrome.tabs.create for extension context, fallback to window.open
    if (typeof chrome !== "undefined" && chrome.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl mx-4 w-full max-w-sm border border-gray-200 animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="text-sm font-semibold text-gray-800">
            {t("quota.title")}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-gray-600">
            {quota.message || t("quota.exceeded")}
          </p>

          {/* Usage bar */}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-500 capitalize">{quota.usageType}</span>
              <span className="font-medium text-red-600">
                {quota.current}/{quota.limit}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-red-500 h-1.5 rounded-full transition-all"
                style={{ width: "100%" }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              {t("quota.plan")}: {quota.plan}
            </p>
          </div>

          {/* Upgrade button */}
          <button
            onClick={handleUpgrade}
            className="w-full py-2.5 px-4 text-sm font-medium rounded-2xl
              bg-gradient-to-b from-brand to-brand-hover text-white
              hover:shadow-lg hover:shadow-brand/20 transition-all flex items-center justify-center gap-1.5"
          >
            {t("quota.upgrade")}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

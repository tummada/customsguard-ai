import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { isCacheValid, RAG_CACHE_TTL_MS } from "@/lib/api-client";
import type { CgRagCache } from "@/types";

interface RagTipsBannerProps {
  hsCodes: string[];
}

interface RagSourceDisplay {
  contentSummary: string | null;
  similarity: number;
  sourceUrl: string | null;
  docNumber: string | null;
}

export default function RagTipsBanner({ hsCodes }: RagTipsBannerProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const uniqueCodes = [...new Set(hsCodes)].sort();
  const cacheKey = `__enrich:${uniqueCodes.join(",")}`;

  const cached = useLiveQuery(
    () => db.cgRagCache.where("query").equals(cacheKey).first(),
    [cacheKey]
  );

  if (!cached || !isCacheValid(cached.cachedAt, RAG_CACHE_TTL_MS)) return null;

  const sources = (cached.sources || []) as RagSourceDisplay[];
  const relevantSources = sources.filter((s) => s.similarity >= 0.7).slice(0, 3);

  return (
    <div className="bg-white rounded-xl border border-indigo-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-xs font-semibold text-indigo-700">
          {t("banner.ragTips")}
        </span>
        <div className="flex items-center gap-2 text-xs">
          {relevantSources.length > 0 && (
            <span className="text-indigo-500">
              {relevantSources.length} {t("chat.sources").toLowerCase()}
            </span>
          )}
          <span className="text-gray-400 text-[10px]">
            {expanded ? "\u25B2" : "\u25BC"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-indigo-100 pt-2">
          <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed mb-2">
            {cached.answer.length > 500
              ? cached.answer.slice(0, 500) + "..."
              : cached.answer}
          </p>

          {relevantSources.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-gray-100">
              <p className="text-[10px] text-gray-500">{t("chat.sources")}:</p>
              {relevantSources.map((src, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[10px]">
                  <span
                    className={
                      src.similarity >= 0.8
                        ? "text-green-600 font-medium"
                        : "text-indigo-500 font-medium"
                    }
                  >
                    {Math.round(src.similarity * 100)}%
                  </span>
                  <span className="text-gray-600 truncate">
                    {src.contentSummary || src.docNumber || "-"}
                  </span>
                  {src.sourceUrl && (
                    <a
                      href={src.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-500 hover:underline flex-shrink-0"
                    >
                      {t("chat.viewOriginal")}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Send, Loader2 } from "lucide-react";
import { apiClient, isCacheValid, RAG_CACHE_TTL_MS } from "@/lib/api-client";
import type { RagSource } from "@/lib/api-client";
import { db } from "@/lib/db";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: RagSource[];
  timestamp: Date;
  fromCache?: boolean;
}

interface ChatPanelProps {
  activeHsCodes?: string[];
}

// --- Intent classification ---

type Intent = "greeting" | "thanks" | "chitchat" | "customs";

const GREETING_PATTERNS = [
  "สวัสดี", "หวัดดี", "ดีครับ", "ดีค่ะ", "ดีจ้า", "ดีนะ",
  "hello", "hi ", "hi!", "hey", "good morning", "good afternoon",
  "ทำอะไรได้บ้าง", "ช่วยอะไรได้", "what can you do", "help me",
  "ถามอะไรได้", "ถามหน่อย", "ถามได้มั้ย", "ถามได้ม่ะ", "ถามได้ไหม",
  "คุณเป็นใคร", "who are you", "แนะนำตัว",
];

const THANKS_PATTERNS = [
  "ขอบคุณ", "ขอบใจ", "thank", "thanks", "thx",
  "เข้าใจแล้ว", "โอเค", "ok ", "okay", "ได้เลย", "รับทราบ",
];

const CUSTOMS_KEYWORDS = [
  "hs", "พิกัด", "อากร", "ภาษี", "นำเข้า", "ส่งออก", "ใบขน",
  "fta", "acfta", "jtepa", "mfn", "tariff", "duty", "import", "export",
  "ศุลกากร", "customs", "กรมศุลกากร", "สินค้า", "ราคา", "cif",
  "ใบอนุญาต", "lpi", "ของต้องกำกัด", "controlled",
  "แหล่งกำเนิด", "origin", "certificate", "form d", "form e",
  "สิทธิพิเศษ", "quota", "โควตา", "วัตถุดิบ", "classification",
  "code", "chapter", "heading", "subheading", "ตอนที่", "ประเภทที่",
  "กุ้ง", "ข้าว", "น้ำตาล", "เหล็ก", "รถยนต์", "เครื่องจักร",
  "regulation", "กฎ", "ระเบียบ", "ประกาศ", "พรบ", "พ.ร.บ",
  "aeo", "green lane", "red line",
];

export function classifyIntent(text: string): Intent {
  const lower = text.toLowerCase().trim();

  // Check greetings (exact or starts-with)
  for (const g of GREETING_PATTERNS) {
    if (lower === g || lower === g.trim() || lower.startsWith(g)) return "greeting";
  }

  // Check thanks
  for (const t of THANKS_PATTERNS) {
    if (lower === t || lower.startsWith(t)) return "thanks";
  }

  // Check if it has customs keywords → send to RAG
  for (const kw of CUSTOMS_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) return "customs";
  }

  // Short generic messages (< 8 chars) without customs keywords → chitchat
  if (lower.length < 8) return "chitchat";

  // Longer messages without keywords → still try RAG (might be relevant)
  return "customs";
}

export default function ChatPanel({ activeHsCodes }: ChatPanelProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addAssistantMessage = (content: string, sources?: RagSource[]) => {
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content, sources, timestamp: new Date() },
    ]);
  };

  const handleSend = async () => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    if (!apiClient.isConfigured()) {
      addAssistantMessage(t("chat.loginFirst"));
      return;
    }

    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed, timestamp: new Date() },
    ]);
    setQuery("");

    // Classify intent
    const intent = classifyIntent(trimmed);

    if (intent === "greeting") {
      addAssistantMessage(t("chat.greeting"));
      return;
    }

    if (intent === "thanks") {
      addAssistantMessage(t("chat.thanksReply"));
      return;
    }

    if (intent === "chitchat") {
      addAssistantMessage(t("chat.chitchatReply"));
      return;
    }

    // Intent is "customs" → proceed to RAG
    setLoading(true);

    try {
      // Cache-first: check Dexie for recent cached result
      const cached = await db.cgRagCache
        .where("query")
        .equals(trimmed)
        .first();

      if (cached && isCacheValid(cached.cachedAt, RAG_CACHE_TTL_MS)) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: cached.answer,
            sources: cached.sources as ChatMessage["sources"],
            timestamp: new Date(),
            fromCache: true,
          },
        ]);
        return;
      }

      // Cache miss or expired: fetch from API
      let contextualQuery = trimmed;
      if (activeHsCodes && activeHsCodes.length > 0) {
        contextualQuery = `[Context: สินค้าในใบขนนี้ HS codes: ${activeHsCodes.join(", ")}]\nคำถาม: ${trimmed}`;
      }
      const result = await apiClient.ragSearch(contextualQuery);

      // Store in cache
      if (cached) {
        await db.cgRagCache.delete(cached.localId!);
      }
      await db.cgRagCache.add({
        query: trimmed,
        answer: result.answer,
        sources: result.sources,
        processingTimeMs: result.processingTimeMs,
        cachedAt: new Date().toISOString(),
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.answer,
          sources: result.sources as ChatMessage["sources"],
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      addAssistantMessage(
        err instanceof Error ? err.message : t("error.connectionFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-xs mt-8">
            <p className="mb-2">{t("chat.emptyTitle")}</p>
            <p className="text-gray-400">{t("chat.emptySubtitle")}</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs shadow-sm ${
                msg.role === "user"
                  ? "bg-brand/10 text-gray-900 border border-brand/20"
                  : "bg-gray-50 text-gray-700 border border-gray-100"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {msg.fromCache && (
                <p className="text-gray-400 text-[10px] mt-1">{t("chat.cached")}</p>
              )}

              {/* Source citations — only show high-relevance sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-gray-500 text-[10px] mb-1">{t("chat.sources")}:</p>
                  {msg.sources
                    .filter((src) => src.similarity >= 0.65)
                    .slice(0, 3)
                    .map((src, j) => (
                    <div
                      key={j}
                      className="text-[10px] text-gray-500 bg-white rounded px-2 py-1.5 mt-1 border border-gray-100"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 font-medium">
                          [{src.docType || src.sourceType}]
                        </span>
                        <span className={`font-medium ${
                          src.similarity >= 0.8 ? "text-green-600" :
                          src.similarity >= 0.7 ? "text-brand" : "text-gray-400"
                        }`}>
                          {Math.round(src.similarity * 100)}%
                        </span>
                      </div>
                      {src.title && (
                        <p className="font-medium text-gray-600 mt-0.5">
                          {src.title}
                        </p>
                      )}
                      {src.docNumber && (
                        <p className="text-gray-400">{t("chat.docNumber")}: {src.docNumber}</p>
                      )}
                      <p className="mt-0.5 text-gray-500">
                        {src.chunkText.length > 120
                          ? src.chunkText.slice(0, 120) + "..."
                          : src.chunkText}
                      </p>
                      {src.sourceUrl && src.sourceUrl.startsWith("https://") && (
                        <a
                          href={src.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline mt-0.5 block"
                        >
                          {t("chat.viewOriginal")} →
                        </a>
                      )}
                    </div>
                  ))}
                  {msg.sources.filter((s) => s.similarity < 0.65).length > 0 && (
                    <p className="text-gray-400 text-[10px] mt-1 italic">
                      {t("chat.lowRelevanceHidden", {
                        count: msg.sources.filter((s) => s.similarity < 0.65).length,
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs text-gray-500 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t("chat.searching")}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("chat.placeholder")}
          className="flex-1 bg-white/50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus-gold"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={!query.trim() || loading}
          className="px-3 py-2 btn-primary text-xs rounded-xl flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">{t("chat.send")}</span>
        </button>
      </div>
    </div>
  );
}

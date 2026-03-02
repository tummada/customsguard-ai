import { useState, useRef, useEffect } from "react";
import { apiClient } from "@/lib/api-client";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: { sourceType: string; sourceId: string; chunkText: string; similarity: number }[];
  timestamp: Date;
}

export default function ChatPanel() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    if (!apiClient.isConfigured()) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Please login to VOLLOS backend first (Settings)",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed, timestamp: new Date() },
    ]);
    setQuery("");
    setLoading(true);

    try {
      const result = await apiClient.ragSearch(trimmed);
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
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "Error occurred",
          timestamp: new Date(),
        },
      ]);
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
            <p className="mb-2">Ask about customs regulations, HS codes, or FTA rates</p>
            <p className="text-gray-600">Powered by RAG Knowledge Base</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                msg.role === "user"
                  ? "bg-amber-600/30 text-amber-100 border border-amber-700/50"
                  : "bg-gray-800 text-gray-200 border border-gray-700"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {/* Source citations */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <p className="text-gray-500 text-[10px] mb-1">Sources:</p>
                  {msg.sources.map((src, j) => (
                    <div
                      key={j}
                      className="text-[10px] text-gray-400 bg-gray-900/50 rounded px-2 py-1 mt-1"
                    >
                      <span className="text-gray-500">[{src.sourceType}]</span>{" "}
                      {src.chunkText.slice(0, 80)}...
                      <span className="text-gray-600 ml-1">
                        ({Math.round(src.similarity * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-400">
              Searching knowledge base...
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
          placeholder="Ask about HS codes, FTA, regulations..."
          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={!query.trim() || loading}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500 text-black text-xs font-medium rounded-lg"
        >
          Ask
        </button>
      </div>
    </div>
  );
}

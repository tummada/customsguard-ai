import { useState } from "react";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);

    try {
      const response = await chrome.runtime.sendMessage({
        type: "SET_API_KEY",
        payload: { provider: "gemini", key: apiKey.trim() },
      });

      if (response?.success) {
        setSaved(true);
        setApiKey(""); // Clear from React state immediately
        setTimeout(() => {
          setSaved(false);
          onClose();
        }, 1000);
      }
    } catch (err) {
      console.error("[VOLLOS] Failed to save API key:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-5 w-full max-w-sm">
        <h3 className="text-sm font-semibold text-white mb-4">
          Settings — AI Provider
        </h3>

        <div className="mb-4">
          <label className="block text-xs text-gray-400 mb-1">
            Provider
          </label>
          <div className="bg-gray-800 rounded px-3 py-2 text-sm text-gray-300">
            Gemini
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-gray-400 mb-1">
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza..."
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
          />
          <p className="text-xs text-gray-500 mt-1">
            Key จะถูกเก็บใน chrome.storage.local เท่านั้น
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={!apiKey.trim() || saving}
            className="flex-1 py-2 text-sm bg-amber-500 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500 text-black font-medium rounded"
          >
            {saved ? "บันทึกแล้ว" : saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith("th") ? "th" : "en";

  const toggle = async () => {
    const next = currentLang === "th" ? "en" : "th";
    await i18n.changeLanguage(next);
    await chrome.storage.local.set({ language: next });
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
      title="Switch language"
    >
      <Globe className="w-3.5 h-3.5" />
      <span className="text-[10px] font-medium">
        <span className={currentLang === "th" ? "text-brand" : ""}>TH</span>
        {" | "}
        <span className={currentLang === "en" ? "text-brand" : ""}>EN</span>
      </span>
    </button>
  );
}

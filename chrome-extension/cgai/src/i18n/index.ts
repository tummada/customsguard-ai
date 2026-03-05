import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import th from "./locales/th.json";
import en from "./locales/en.json";

async function detectLanguage(): Promise<string> {
  try {
    const result = await chrome.storage.local.get("language");
    if (result.language) return result.language;
  } catch { /* ignore in test env */ }

  try {
    const uiLang = chrome.i18n?.getUILanguage?.();
    if (uiLang?.startsWith("th")) return "th";
  } catch { /* ignore */ }

  return "th";
}

// Initialize synchronously with fallback, then update language asynchronously
i18next.use(initReactI18next).init({
  fallbackLng: "th",
  lng: "th",
  resources: { th: { translation: th }, en: { translation: en } },
  interpolation: { escapeValue: false },
});

// Async language detection (updates after init)
detectLanguage().then((lang) => {
  if (lang !== i18next.language) {
    i18next.changeLanguage(lang);
  }
});

export default i18next;

import "@testing-library/jest-dom/vitest";

// Mock react-i18next so components using useTranslation don't crash
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn(), language: "th" },
  }),
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

// In-memory chrome.storage.local mock
const store = new Map<string, unknown>();

const chromeStorageLocal = {
  get: vi.fn(async (keys: string | string[]) => {
    const result: Record<string, unknown> = {};
    const keyList = typeof keys === "string" ? [keys] : keys;
    for (const key of keyList) {
      if (store.has(key)) result[key] = store.get(key);
    }
    return result;
  }),
  set: vi.fn(async (items: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(items)) {
      store.set(key, value);
    }
  }),
  remove: vi.fn(async (keys: string | string[]) => {
    const keyList = typeof keys === "string" ? [keys] : keys;
    for (const key of keyList) {
      store.delete(key);
    }
  }),
};

// Session storage uses the same implementation (separate store)
const sessionStore = new Map<string, unknown>();

const chromeStorageSession = {
  get: vi.fn(async (keys: string | string[]) => {
    const result: Record<string, unknown> = {};
    const keyList = typeof keys === "string" ? [keys] : keys;
    for (const key of keyList) {
      if (sessionStore.has(key)) result[key] = sessionStore.get(key);
    }
    return result;
  }),
  set: vi.fn(async (items: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(items)) {
      sessionStore.set(key, value);
    }
  }),
  remove: vi.fn(async (keys: string | string[]) => {
    const keyList = typeof keys === "string" ? [keys] : keys;
    for (const key of keyList) {
      sessionStore.delete(key);
    }
  }),
};

// Assign global chrome mock
Object.assign(globalThis, {
  chrome: {
    storage: { local: chromeStorageLocal, session: chromeStorageSession },
    runtime: {
      sendMessage: vi.fn(),
      onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  },
});

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Reset storage between tests
beforeEach(() => {
  store.clear();
  sessionStore.clear();
  vi.clearAllMocks();
});

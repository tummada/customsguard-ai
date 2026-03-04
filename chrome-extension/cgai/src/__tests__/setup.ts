import "@testing-library/jest-dom/vitest";

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

// Assign global chrome mock
Object.assign(globalThis, {
  chrome: {
    storage: { local: chromeStorageLocal },
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
  vi.clearAllMocks();
});

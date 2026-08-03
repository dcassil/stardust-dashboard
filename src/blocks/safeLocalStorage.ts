export interface SafeLocalStorage {
  get(key: string): string | null;
  getJson<T>(key: string, isValue: (value: unknown) => value is T): T | null;
  set(key: string, value: string): void;
  setJson(key: string, value: unknown): void;
  remove(key: string): void;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export const safeLocalStorage: SafeLocalStorage = {
  get(key: string): string | null {
    try {
      return storage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },

  getJson<T>(key: string, isValue: (value: unknown) => value is T): T | null {
    const raw = safeLocalStorage.get(key);
    if (raw === null) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return isValue(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },

  set(key: string, value: string): void {
    try {
      storage()?.setItem(key, value);
    } catch {
      // Persistence is optional; quota and sandbox failures are swallowed.
    }
  },

  setJson(key: string, value: unknown): void {
    try {
      safeLocalStorage.set(key, JSON.stringify(value));
    } catch {
      // Circular or unsupported values are treated like unavailable storage.
    }
  },

  remove(key: string): void {
    try {
      storage()?.removeItem(key);
    } catch {
      // Removing persisted convenience data must never break the editor.
    }
  },
};

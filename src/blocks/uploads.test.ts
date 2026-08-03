import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { safeLocalStorage } from "./safeLocalStorage.js";
import { createUploadRegistry } from "./uploads.js";

class MemoryStorage implements Storage {
  #items = new Map<string, string>();

  get length(): number {
    return this.#items.size;
  }

  clear(): void {
    this.#items.clear();
  }

  getItem(key: string): string | null {
    return this.#items.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.#items.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.#items.delete(key);
  }

  setItem(key: string, value: string): void {
    this.#items.set(key, value);
  }
}

class ThrowingStorage extends MemoryStorage {
  override setItem(): void {
    throw new DOMException("Quota exceeded", "QuotaExceededError");
  }
}

function stubStorage(storage: Storage | undefined): void {
  vi.stubGlobal("localStorage", storage);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000);
  stubStorage(new MemoryStorage());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("safeLocalStorage", () => {
  it("returns null when storage is absent", () => {
    stubStorage(undefined);

    expect(safeLocalStorage.get("missing")).toBeNull();
    expect(safeLocalStorage.getJson("missing", Array.isArray)).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    safeLocalStorage.set("uploads", "{");

    expect(safeLocalStorage.getJson("uploads", Array.isArray)).toBeNull();
  });

  it("swallows quota errors on set", () => {
    stubStorage(new ThrowingStorage());

    expect(() => {
      safeLocalStorage.set("uploads", "[]");
    }).not.toThrow();
  });
});

describe("createUploadRegistry", () => {
  it("lists uploads newest-first", () => {
    const registry = createUploadRegistry({ key: "uploads", max: 10 });

    registry.add("old.png", "data:image/png;base64,old");
    vi.setSystemTime(2_000);
    registry.add("new.png", "data:image/png;base64,new");

    expect(registry.list().map((upload) => upload.name)).toEqual([
      "new.png",
      "old.png",
    ]);
  });

  it("dedupes by dataUrl when adding", () => {
    const registry = createUploadRegistry({ key: "uploads", max: 10 });

    registry.add("old-name.png", "data:image/png;base64,same");
    vi.setSystemTime(2_000);
    registry.add("new-name.png", "data:image/png;base64,same");

    expect(registry.list()).toEqual([
      {
        name: "new-name.png",
        dataUrl: "data:image/png;base64,same",
        addedAt: 2_000,
      },
    ]);
  });

  it("falls back to an empty list for malformed storage", () => {
    safeLocalStorage.set("uploads", "not-json");
    const registry = createUploadRegistry({ key: "uploads", max: 10 });

    expect(registry.list()).toEqual([]);
  });

  it("enforces the configured cap", () => {
    const registry = createUploadRegistry({ key: "uploads", max: 2 });

    registry.add("one.png", "data:one");
    vi.setSystemTime(2_000);
    registry.add("two.png", "data:two");
    vi.setSystemTime(3_000);
    registry.add("three.png", "data:three");

    expect(registry.list().map((upload) => upload.name)).toEqual([
      "three.png",
      "two.png",
    ]);
  });
});

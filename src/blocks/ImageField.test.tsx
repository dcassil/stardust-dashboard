import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CmsContent } from "@stardust-cms/iframe-adapter/protocol";
import type { BlockFieldPatch } from "./BlockType.js";
import { ImageField } from "./ImageField.js";
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

const content: CmsContent = {
  id: "image-1",
  type: "image",
  value: "",
};

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(1_000);
  vi.stubGlobal("localStorage", new MemoryStorage());
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ImageField", () => {
  it("edits value from URL mode", () => {
    const onEdit = vi.fn<(patch: BlockFieldPatch) => void>();
    render(<ImageField content={content} onEdit={onEdit} />);

    fireEvent.change(screen.getByTestId("panel-image"), {
      target: { value: "https://example.test/image.png" },
    });

    expect(onEdit).toHaveBeenCalledWith({
      value: "https://example.test/image.png",
    });
  });

  it("reads an uploaded file into the registry and edits value", async () => {
    const onEdit = vi.fn<(patch: BlockFieldPatch) => void>();
    const key = "image-field-uploads";
    const registry = createUploadRegistry({ key, max: 10 });
    render(
      <ImageField content={content} onEdit={onEdit} uploadRegistryKey={key} />,
    );

    fireEvent.change(screen.getByTestId("image-source"), {
      target: { value: "upload" },
    });
    const file = new File(["hello"], "hello.png", { type: "image/png" });
    fireEvent.change(screen.getByTestId("panel-image-upload"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(onEdit).toHaveBeenCalledWith({
        value: "data:image/png;base64,aGVsbG8=",
      });
    });
    expect(registry.list()).toEqual([
      {
        name: "hello.png",
        dataUrl: "data:image/png;base64,aGVsbG8=",
        addedAt: 1_000,
      },
    ]);
  });

  it("restores a stored dataUrl from recent mode", () => {
    const key = "image-field-uploads";
    const dataUrl = "data:image/png;base64,stored";
    createUploadRegistry({ key, max: 10 }).add("stored.png", dataUrl);
    const onEdit = vi.fn<(patch: BlockFieldPatch) => void>();
    render(
      <ImageField content={content} onEdit={onEdit} uploadRegistryKey={key} />,
    );

    fireEvent.change(screen.getByTestId("image-source"), {
      target: { value: "recent" },
    });
    fireEvent.change(screen.getByTestId("panel-image-recent"), {
      target: { value: dataUrl },
    });

    expect(onEdit).toHaveBeenCalledWith({ value: dataUrl });
  });
});

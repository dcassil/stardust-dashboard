import { safeLocalStorage } from "./safeLocalStorage.js";

export interface DemoUpload {
  name: string;
  dataUrl: string;
  addedAt: number;
}

export interface UploadRegistryOptions {
  key: string;
  max: number;
}

export interface UploadRegistry {
  list(): DemoUpload[];
  add(name: string, dataUrl: string): DemoUpload[];
}

export function isDemoUpload(value: unknown): value is DemoUpload {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Record<keyof DemoUpload, unknown>>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.dataUrl === "string" &&
    typeof candidate.addedAt === "number"
  );
}

function isDemoUploadArray(value: unknown): value is DemoUpload[] {
  return Array.isArray(value) && value.every(isDemoUpload);
}

export function createUploadRegistry({
  key,
  max,
}: UploadRegistryOptions): UploadRegistry {
  const limit = Math.max(0, max);
  const list = (): DemoUpload[] => {
    const uploads = safeLocalStorage.getJson(key, isDemoUploadArray) ?? [];
    return [...uploads].sort((a, b) => b.addedAt - a.addedAt).slice(0, limit);
  };

  const add = (name: string, dataUrl: string): DemoUpload[] => {
    const existing = list().filter((upload) => upload.dataUrl !== dataUrl);
    const next = [{ name, dataUrl, addedAt: Date.now() }, ...existing].slice(
      0,
      limit,
    );
    safeLocalStorage.setJson(key, next);
    return next;
  };

  return { list, add };
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = (): void => {
      reject(reader.error ?? new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}

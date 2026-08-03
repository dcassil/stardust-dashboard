import { useMemo, useState, type ReactNode } from "react";
import type { CmsContent } from "@stardust-cms/iframe-adapter/protocol";
import type { BlockFieldPatch } from "./BlockType.js";
import {
  createUploadRegistry,
  readFileAsDataUrl,
  type DemoUpload,
  type UploadRegistry,
} from "./uploads.js";

export const DEFAULT_IMAGE_UPLOADS_KEY = "stardust-dashboard-image-uploads";

type ImageSource = "url" | "upload" | "recent";

export interface ImageFieldClassNames {
  root?: string | undefined;
  label?: string | undefined;
  sourceSelect?: string | undefined;
  control?: string | undefined;
  hint?: string | undefined;
  error?: string | undefined;
}

export interface ImageFieldProps {
  content: CmsContent;
  onEdit: (patch: BlockFieldPatch) => void;
  className?: string | undefined;
  classNames?: ImageFieldClassNames | undefined;
  uploadRegistry?: UploadRegistry | undefined;
  uploadRegistryKey?: string | undefined;
  maxUploads?: number | undefined;
}

interface SourceInputProps {
  source: ImageSource;
  value: string;
  uploads: readonly DemoUpload[];
  onEdit: (patch: BlockFieldPatch) => void;
  onFile: (file: File | undefined) => void;
  classNames: ImageFieldClassNames | undefined;
}

function cx(...parts: readonly (string | undefined)[]): string {
  return parts.filter((part) => part !== undefined && part !== "").join(" ");
}

function isImageSource(value: string): value is ImageSource {
  return value === "url" || value === "upload" || value === "recent";
}

function initialSource(value: string, uploads: readonly DemoUpload[]): ImageSource {
  return value !== "" && uploads.some((upload) => upload.dataUrl === value)
    ? "recent"
    : "url";
}

export function ImageField({
  content,
  onEdit,
  className,
  classNames,
  uploadRegistry,
  uploadRegistryKey = DEFAULT_IMAGE_UPLOADS_KEY,
  maxUploads = 20,
}: ImageFieldProps): ReactNode {
  const registry = useMemo(
    () =>
      uploadRegistry ??
      createUploadRegistry({ key: uploadRegistryKey, max: maxUploads }),
    [uploadRegistry, uploadRegistryKey, maxUploads],
  );
  const value = content.value ?? "";
  const [uploads, setUploads] = useState<DemoUpload[]>(() => registry.list());
  const [source, setSource] = useState<ImageSource>(() =>
    initialSource(value, uploads),
  );
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined): Promise<void> => {
    if (file === undefined) return;
    setError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (dataUrl === "") throw new Error("FileReader returned an empty result");
      setUploads(registry.add(file.name, dataUrl));
      onEdit({ value: dataUrl });
    } catch {
      setError("Could not read that file.");
    }
  };

  return (
    <label className={cx("stardust-image-field", className, classNames?.root)}>
      <span className={cx("stardust-image-field__label", classNames?.label)}>
        Image
      </span>
      <select
        className={cx("stardust-image-field__source", classNames?.sourceSelect)}
        data-testid="image-source"
        value={source}
        onChange={(event) => {
          const next = event.target.value;
          if (isImageSource(next)) setSource(next);
        }}
      >
        <option value="url">URL</option>
        <option value="upload">Upload from computer</option>
        <option value="recent">Recently uploaded</option>
      </select>

      {renderSourceInput({
        source,
        value,
        uploads,
        onEdit,
        onFile: (file) => {
          void handleFile(file);
        },
        classNames,
      })}

      {error !== null && (
        <p
          className={cx("stardust-image-field__error", classNames?.error)}
          role="alert"
        >
          {error}
        </p>
      )}
    </label>
  );
}

function renderSourceInput({
  source,
  value,
  uploads,
  onEdit,
  onFile,
  classNames,
}: SourceInputProps): ReactNode {
  if (source === "url") {
    return (
      <input
        key="url"
        type="text"
        className={cx("stardust-image-field__control", classNames?.control)}
        data-testid="panel-image"
        value={value}
        onChange={(event) => {
          onEdit({ value: event.target.value });
        }}
      />
    );
  }
  if (source === "upload") {
    return (
      <input
        key="upload"
        type="file"
        accept="image/*"
        className={cx("stardust-image-field__control", classNames?.control)}
        data-testid="panel-image-upload"
        onChange={(event) => {
          onFile(event.target.files?.[0]);
        }}
      />
    );
  }
  return renderRecent(uploads, value, onEdit, classNames);
}

function renderRecent(
  uploads: readonly DemoUpload[],
  value: string,
  onEdit: (patch: BlockFieldPatch) => void,
  classNames: ImageFieldClassNames | undefined,
): ReactNode {
  if (uploads.length === 0) {
    return (
      <p className={cx("stardust-image-field__hint", classNames?.hint)}>
        No uploads yet.
      </p>
    );
  }
  return (
    <select
      className={cx("stardust-image-field__control", classNames?.control)}
      data-testid="panel-image-recent"
      value={uploads.some((upload) => upload.dataUrl === value) ? value : ""}
      onChange={(event) => {
        if (event.target.value !== "") onEdit({ value: event.target.value });
      }}
    >
      <option value="" disabled>
        Choose an uploaded image
      </option>
      {uploads.map((upload) => (
        <option key={upload.dataUrl} value={upload.dataUrl}>
          {upload.name}
        </option>
      ))}
    </select>
  );
}

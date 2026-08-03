import type { BlockType } from "./BlockType.js";
import {
  ImageField,
  type ImageFieldClassNames,
} from "./ImageField.js";
import type { UploadRegistry } from "./uploads.js";

export interface ImageBlockTypeOptions {
  label?: string | undefined;
  className?: string | undefined;
  classNames?: ImageFieldClassNames | undefined;
  uploadRegistry?: UploadRegistry | undefined;
  uploadRegistryKey?: string | undefined;
  maxUploads?: number | undefined;
}

export function createImageBlockType(
  options: ImageBlockTypeOptions = {},
): BlockType<"image"> {
  return {
    type: "image",
    label: options.label ?? "Image",
    defaultValue: () => "",
    renderField: (content, onEdit) => (
      <ImageField
        content={content}
        onEdit={onEdit}
        className={options.className}
        classNames={options.classNames}
        uploadRegistry={options.uploadRegistry}
        uploadRegistryKey={options.uploadRegistryKey}
        maxUploads={options.maxUploads}
      />
    ),
  };
}

export const imageBlockType: BlockType<"image"> = createImageBlockType();

import { useUploadFile } from "@convex-dev/r2/react";
import { api } from "@/convex/_generated/api";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const PUBLIC_BASE = (import.meta.env.VITE_R2_PUBLIC_URL ?? "").replace(/\/$/, "");

// Uploads an image directly to R2 (via a Convex-signed URL) and returns its
// permanent public URL. Type/size are validated client-side because the file no
// longer passes through a server route. Throws an Error whose `code` is one of
// "unsupported_file_type" | "file_too_large" on rejection.
export function useImageUpload() {
  const upload = useUploadFile(api.r2);

  return async function uploadImage(file) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw Object.assign(new Error("unsupported_file_type"), {
        code: "unsupported_file_type",
      });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw Object.assign(new Error("file_too_large"), {
        code: "file_too_large",
      });
    }
    const key = await upload(file);
    return `${PUBLIC_BASE}/${key}`;
  };
}

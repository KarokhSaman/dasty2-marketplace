import { useUploadFile } from "@convex-dev/r2/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const PUBLIC_BASE = (import.meta.env.VITE_R2_PUBLIC_URL ?? "").replace(/\/$/, "");
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function getRetryDelay(attemptNumber) {
  return RETRY_DELAY_MS * Math.pow(2, attemptNumber);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function useImageUpload() {
  const upload = useUploadFile(api.r2);
  const generateDevUploadUrl = useMutation(api.devUploads.generateUploadUrl);
  const resolveDevUploadUrl = useMutation(api.devUploads.resolveUrl);

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

    if (import.meta.env.DEV) {
      const uploadUrl = await generateDevUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "content-type": file.type },
        body: file,
      });
      const result = await response.json();
      if (!response.ok || !result.storageId) {
        throw Object.assign(new Error(result.error ?? "upload_failed"), {
          code: result.error ?? "upload_failed",
        });
      }
      const url = await resolveDevUploadUrl({ storageId: result.storageId });
      if (!url) {
        throw Object.assign(new Error("upload_failed"), {
          code: "upload_failed",
        });
      }
      return url;
    }

    let lastError;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const key = await upload(file);
        return `${PUBLIC_BASE}/${key}`;
      } catch (err) {
        lastError = err;
        console.error(`R2 upload attempt ${attempt + 1}/${MAX_RETRIES} failed:`, {
          message: err.message,
          attempt: attempt + 1,
          fileName: file.name,
          fileSize: file.size,
        });

        if (attempt < MAX_RETRIES - 1) {
          const delayMs = getRetryDelay(attempt);
          console.log(`Retrying upload in ${delayMs}ms...`);
          await sleep(delayMs);
        }
      }
    }

    console.error("R2 upload failed after all retries:", {
      message: lastError?.message,
      error: lastError,
      fileName: file.name,
      fileSize: file.size,
    });

    throw Object.assign(
      new Error(`R2 upload failed: ${lastError?.message || "Network error - please check your connection and try again"}`),
      {
        code: "r2_upload_failed",
        originalError: lastError,
      }
    );
  };
}

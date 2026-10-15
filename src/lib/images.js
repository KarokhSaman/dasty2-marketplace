// Product photos live on R2 as full-size originals. When Cloudflare Image
// Transformations is enabled for the assets domain, ask it for a smaller copy
// instead (`/cdn-cgi/image/width=…`). Switched by VITE_IMAGE_TRANSFORMS in
// wrangler.jsonc; while it is "false" (or if a resized copy fails to load) the
// original URL is used, so nothing breaks.
const BASE = (import.meta.env.VITE_R2_PUBLIC_URL ?? "").replace(/\/$/, "");
const ENABLED = import.meta.env.VITE_IMAGE_TRANSFORMS === "true";

export function photoProps(url, width) {
  if (!ENABLED || !url || !BASE || !url.startsWith(`${BASE}/`)) return { src: url };
  const key = url.slice(BASE.length + 1);
  return {
    src: `${BASE}/cdn-cgi/image/width=${width},quality=80,format=auto/${key}`,
    onError(e) {
      const img = e.currentTarget;
      if (img.dataset.fallback) return;
      img.dataset.fallback = "1";
      img.src = url;
    },
  };
}

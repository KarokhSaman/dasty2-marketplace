import { MAX_UPLOAD_BYTES } from "@/lib/useImageUpload";

function toBlob(canvas, quality) {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not save the edited photo"))), "image/jpeg", quality),
  );
}

// The photo is read through /api/photo (same origin), with the camera's
// orientation tag applied first, matching how <img> shows it.
async function loadPhoto(url) {
  const res = await fetch(`/api/photo?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error("Could not load the photo");
  return createImageBitmap(await res.blob(), { imageOrientation: "from-image" });
}

async function toFile(canvas, name) {
  let blob = await toBlob(canvas, 0.92);
  if (blob.size > MAX_UPLOAD_BYTES) blob = await toBlob(canvas, 0.82);
  return new File([blob], name, { type: "image/jpeg" });
}

/**
 * Cuts out the part of a product photo given as fractions of its width and
 * height ({ x, y, w, h }) and returns it as a new JPEG File, ready to upload.
 * Full resolution is kept: nothing is scaled, only cut.
 */
export async function cropPhoto(url, part) {
  const bitmap = await loadPhoto(url);
  const sx = Math.round(part.x * bitmap.width), sy = Math.round(part.y * bitmap.height);
  const sw = Math.max(1, Math.min(bitmap.width - sx, Math.round(part.w * bitmap.width)));
  const sh = Math.max(1, Math.min(bitmap.height - sy, Math.round(part.h * bitmap.height)));
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const g = canvas.getContext("2d");
  g.fillStyle = "#fff"; // transparent PNGs get a white background, not black
  g.fillRect(0, 0, sw, sh);
  g.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
  bitmap.close?.();
  return toFile(canvas, "cropped.jpg");
}

/**
 * Turns a product photo by `quarterTurns` × 90° clockwise and returns it as a
 * new JPEG File, ready to upload. It is drawn once at the final angle, so it
 * is re-saved only once.
 */
export async function rotatePhoto(url, quarterTurns) {
  const turns = ((quarterTurns % 4) + 4) % 4;
  const bitmap = await loadPhoto(url);

  const sideways = turns % 2 === 1;
  const canvas = document.createElement("canvas");
  canvas.width = sideways ? bitmap.height : bitmap.width;
  canvas.height = sideways ? bitmap.width : bitmap.height;
  const g = canvas.getContext("2d");
  g.fillStyle = "#fff"; // transparent PNGs get a white background, not black
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.translate(canvas.width / 2, canvas.height / 2);
  g.rotate((turns * Math.PI) / 2);
  g.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  bitmap.close?.();
  return toFile(canvas, "rotated.jpg");
}

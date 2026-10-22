import { MAX_UPLOAD_BYTES } from "@/lib/useImageUpload";

function toBlob(canvas, quality) {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not save the rotated photo"))), "image/jpeg", quality),
  );
}

/**
 * Turns a product photo by `quarterTurns` × 90° clockwise and returns it as a
 * new JPEG File, ready to upload. The photo is read through /api/photo (same
 * origin), and drawn once at the final angle, so it is re-saved only once.
 */
export async function rotatePhoto(url, quarterTurns) {
  const turns = ((quarterTurns % 4) + 4) % 4;
  const res = await fetch(`/api/photo?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error("Could not load the photo");
  // Applies the camera's orientation tag first, matching how <img> shows it.
  const bitmap = await createImageBitmap(await res.blob(), { imageOrientation: "from-image" });

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

  let blob = await toBlob(canvas, 0.92);
  if (blob.size > MAX_UPLOAD_BYTES) blob = await toBlob(canvas, 0.82);
  return new File([blob], "rotated.jpg", { type: "image/jpeg" });
}

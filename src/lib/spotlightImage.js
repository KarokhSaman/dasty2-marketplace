// "Spotlight" story: a pattern-break story, made from Admin → Stories with
// the Spotlight button. A deep brand wine background with the baby drawings
// faint in white, a question for parents that fits the product's category
// (its second line on a red highlight), the seller's real photo in a large
// card with the product's name across its bottom, and an empty white bar for
// the Instagram link sticker. No price: the link is how to find out.
//
// All writing is drawn here, in Noto Kufi so it looks different from the
// regular stories.

import notoKufi from "@fontsource/noto-kufi-arabic/files/noto-kufi-arabic-arabic-900-normal.woff2?url";
import * as m from "@/paraglide/messages";
import {
  STORY_W as W, STORY_H as H, BRAND, STORY_FONT,
  loadImage, loadStoryFonts, roundedRect, smartCrop,
} from "@/lib/storyImage";
import { CATEGORY_CONFIG } from "@/lib/categories";

// Category → the question asked for it.
const QUESTION = {
  Toy: "Toy",
  Electronic: "Other",
  Other: "Other",
  Crib: "Sleep",
  Cradle: "Sleep",
  Bassinet: "Sleep",
  "Carry Cot": "Sleep",
  "Breast Pump": "Pump",
  Stroller: "Stroller",
  "Baby Walker": "Walk",
  "Car Seat": "CarSeat",
  "High Chair": "Feeding",
  Bouncer: "Sleep",
};

const SPOT_FONT = "MndallanSpotlight";
let spotFont;
function loadSpotFont() {
  if (spotFont) return spotFont;
  const face = new FontFace(SPOT_FONT, `url(${notoKufi}) format("woff2")`, {
    weight: "900", unicodeRange: "U+0600-06FF, U+0750-077F, U+200C-200F, U+FB50-FDFF, U+FE70-FEFC",
  });
  spotFont = face.load().then((f) => { document.fonts.add(f); return true; }).catch(() => (spotFont = undefined, false));
  return spotFont;
}

// Set the font at `px`, shrinking it until `text` fits in `max`.
function fit(ctx, font, text, px, max, min = 34) {
  let f = px;
  ctx.font = font(f);
  while (ctx.measureText(text).width > max && f > min) { f -= 2; ctx.font = font(f); }
  return f;
}

function drawSpotlight(ctx, { img, storyCrop, title, code, q1, q2, find, family, pageFamily, drawings = [] }) {
  const font = (px) => `900 ${px}px ${family}`;

  // deep brand wine, with the baby drawings faint in white
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#5c0a22"); g.addColorStop(1, "#2a0410");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (drawings.length) {
    const size = 86, step = 150;
    const inks = drawings.map((d) => {
      const c = document.createElement("canvas"); c.width = c.height = size;
      const t = c.getContext("2d");
      const k = Math.min(size / d.width, size / d.height);
      t.drawImage(d, (size - d.width * k) / 2, (size - d.height * k) / 2, d.width * k, d.height * k);
      t.globalCompositeOperation = "source-in"; t.fillStyle = "#ffffff"; t.fillRect(0, 0, size, size);
      return c;
    });
    let n = 0;
    for (let row = 0, y = -30; y < H; row++, y += step * 0.86) {
      for (let x = row % 2 ? -10 : -85; x < W; x += step, n++) {
        ctx.save(); ctx.globalAlpha = 0.07;
        ctx.translate(x + size / 2, y + size / 2); ctx.rotate((((n * 37) % 11) - 5) * 0.06);
        ctx.drawImage(inks[(n * 5 + row) % inks.length], -size / 2, -size / 2);
        ctx.restore();
      }
    }
  }
  const soft = "rgba(255,255,255,0.88)", strong = "#ffffff", quiet = "rgba(255,255,255,0.7)";

  // the question: a lighter first line, then the second on a red highlight
  ctx.save();
  ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = soft;
  fit(ctx, font, q1, 66, W - 140); ctx.fillText(q1, W / 2, 290);
  const f2 = fit(ctx, font, q2, 86, W - 200);
  const w2 = ctx.measureText(q2).width;
  const hb = f2 * 1.5, hy = 406 - f2 * 1.02;
  roundedRect(ctx, W / 2 - w2 / 2 - 40, hy, w2 + 80, hb, 26);
  ctx.fillStyle = BRAND; ctx.fill();
  ctx.fillStyle = "#ffffff"; ctx.fillText(q2, W / 2, 406);
  ctx.restore();

  // the seller's photo, straight, in a large rounded card with a thin white rim
  const fx = 72, fy = 500, fw = W - 144, fh = 940;
  const crop = img && (storyCrop
    ? { sx: storyCrop.x * img.width, sy: storyCrop.y * img.height, sw: storyCrop.w * img.width, sh: storyCrop.h * img.height }
    : smartCrop(img, fw / fh));
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 80; ctx.shadowOffsetY = 30;
  roundedRect(ctx, fx - 6, fy - 6, fw + 12, fh + 12, 52); ctx.fillStyle = "#ffffff"; ctx.fill();
  ctx.restore();
  ctx.save();
  roundedRect(ctx, fx, fy, fw, fh, 46); ctx.clip();
  if (crop) {
    // cover the card: the crop is widened or heightened to its shape
    let { sx, sy, sw, sh } = crop;
    const want = fw / fh;
    if (sw / sh > want) { const n = sh * want; sx += (sw - n) / 2; sw = n; } else { const n = sw / want; sy += (sh - n) / 2; sh = n; }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, fx, fy, fw, fh);
  } else {
    ctx.fillStyle = "#f3ece6"; ctx.fillRect(fx, fy, fw, fh);
  }
  // the product name on a dark band across the photo's bottom
  if (title) {
    const band = ctx.createLinearGradient(0, fy + fh - 260, 0, fy + fh);
    band.addColorStop(0, "rgba(15,10,12,0)");
    band.addColorStop(1, "rgba(15,10,12,0.82)");
    ctx.fillStyle = band; ctx.fillRect(fx, fy + fh - 260, fw, 260);
    ctx.fillStyle = "#ffffff"; ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    fit(ctx, font, title, 58, fw - 100);
    ctx.fillText(title, W / 2, fy + fh - 58);
  }
  ctx.restore();

  // "find it here" with a small arrow, and the white bar for the link sticker
  ctx.save();
  ctx.fillStyle = strong; ctx.font = font(58); ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(find, W / 2, 1518);
  ctx.strokeStyle = BRAND; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(W / 2 - 18, 1586); ctx.lineTo(W / 2, 1604); ctx.lineTo(W / 2 + 18, 1586); ctx.stroke();
  ctx.restore();
  const sw = 760, sh = 140, sx = (W - sw) / 2, sy = 1640;
  ctx.save();
  roundedRect(ctx, sx - 10, sy - 10, sw + 20, sh + 20, (sh + 20) / 2);
  ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fill();
  roundedRect(ctx, sx, sy, sw, sh, sh / 2); ctx.fillStyle = "#ffffff"; ctx.fill();
  ctx.restore();

  // code and site, small and quiet, at the bottom
  ctx.save();
  ctx.fillStyle = quiet; ctx.font = `700 32px ${pageFamily}`; ctx.textBaseline = "alphabetic"; ctx.direction = "ltr";
  if (code) { ctx.textAlign = "left"; ctx.fillText(code, 72, H - 64); }
  ctx.textAlign = "right"; ctx.fillText("mndallan.com", W - 72, H - 64);
  ctx.restore();
}

/**
 * Draw a Spotlight story and return it as a PNG blob.
 *
 * @param {object} p
 * @param {string} p.title     product title, shown in the red cloud
 * @param {string} p.category  product category (picks the question)
 * @param {string} [p.photo]   absolute image URL (R2)
 * @param {object} [p.storyCrop] admin-set framing ({ url, x, y, w, h }), used
 *                             only while `url` is this photo
 * @param {string} [p.code]    product code, e.g. "#26-0009"
 * @param {string} [p.locale]  language of the writing (default Kurdish)
 */
export async function buildSpotlightImage({ title, category, photo, storyCrop, code, locale = "ckb" }) {
  const q = QUESTION[category] ?? QUESTION.Other;
  const L = { locale };
  const q1 = m[`spotlight${q}1`]({}, L), q2 = m[`spotlight${q}2`]({}, L), find = m.spotlightFindHere({}, L);
  const crop = storyCrop && storyCrop.url === photo ? storyCrop : null;

  const drawingUrls = CATEGORY_CONFIG.filter((c) => c.value !== "all").map((c) => c.img);
  const [img, storyOk, spotOk, ...drawingImgs] = await Promise.all([
    loadImage(photo, { cors: true }),
    loadStoryFonts(),
    loadSpotFont(),
    ...drawingUrls.map((u) => loadImage(u, { cors: true })),
  ]);
  const drawings = drawingImgs.filter(Boolean);
  const page = getComputedStyle(document.body).fontFamily || "sans-serif";
  const pageFamily = storyOk ? `"${STORY_FONT}", ${page}` : page;
  // Noto Kufi for the Kurdish; Latin letters in a title fall back to the story font
  const family = spotOk ? `"${SPOT_FONT}", ${pageFamily}` : pageFamily;

  const render = (withPhoto) => {
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    drawSpotlight(ctx, { img: withPhoto ? img : null, storyCrop: crop, title, code, q1, q2, find, family, pageFamily, drawings: withPhoto ? drawings : [] });
    return canvas;
  };
  const toBlob = (canvas) => new Promise((resolve, reject) => {
    try { canvas.toBlob(resolve, "image/png"); } catch (err) { reject(err); }
  });
  const canvas = render(true);
  if (!canvas) return null;
  try {
    return await toBlob(canvas);
  } catch {
    // a photo without CORS made the canvas unexportable: draw it without
    const plain = render(false);
    return plain ? toBlob(plain) : null;
  }
}

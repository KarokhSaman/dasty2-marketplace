// "Spotlight" story: a pattern-break story that goes between the regular
// product stories (Admin → Stories puts one after every 5). A photographed
// room for the product's category (made once with Codex, public/spotlight/),
// a question for parents, the seller's real photo in a white frame with the
// product's name in a red cloud, and an empty white bar for the Instagram
// link sticker. No price: the link is how to find out.
//
// All writing is drawn here (AI image tools break Kurdish letters), in
// Noto Kufi so it looks different from the regular stories.

import notoKufi from "@fontsource/noto-kufi-arabic/files/noto-kufi-arabic-arabic-900-normal.woff2?url";
import * as m from "@/paraglide/messages";
import {
  STORY_W as W, STORY_H as H, INK, INK_SOFT, BRAND, STORY_FONT,
  loadImage, loadStoryFonts, roundedRect, smartCrop, drawHeader,
} from "@/lib/storyImage";

// Category → [room, question]. Rooms are 1080×1920 JPEGs with a calm top
// (for the question) and an empty middle (for the photo).
const SPOTLIGHT = {
  Toy: ["living", "Toy"],
  Electronic: ["living", "Other"],
  Other: ["living", "Other"],
  Crib: ["nursery", "Sleep"],
  Cradle: ["nursery", "Sleep"],
  Bassinet: ["nursery", "Sleep"],
  "Carry Cot": ["nursery", "Sleep"],
  "Breast Pump": ["nursery", "Pump"],
  Stroller: ["park", "Stroller"],
  "Baby Walker": ["park", "Walk"],
  "Car Seat": ["entrance", "CarSeat"],
  "High Chair": ["kitchen", "Feeding"],
  Bouncer: ["play", "Walk"],
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

// A few short strokes fanning out from a point, as small decorations.
function rays(ctx, x, y, color, rot, n = 3, len = 30) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.strokeStyle = color; ctx.lineWidth = 9; ctx.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const a = (i - (n - 1) / 2) * 0.55;
    ctx.beginPath();
    ctx.moveTo(Math.sin(a) * 20, -Math.cos(a) * 20);
    ctx.lineTo(Math.sin(a) * (20 + len), -Math.cos(a) * (20 + len));
    ctx.stroke();
  }
  ctx.restore();
}

function heart(ctx, x, y, s, rot, color) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s / 24, s / 24);
  ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.lineJoin = "round";
  ctx.stroke(new Path2D("M12 20s-7.5-4.6-9.3-9.2C1.3 7.3 3.6 4 7 4c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.4 0 5.7 3.3 4.3 6.8C19.5 15.4 12 20 12 20z"));
  ctx.restore();
}

// Set the font at `px`, shrinking it until `text` fits in `max`.
function fit(ctx, font, text, px, max, min = 34) {
  let f = px;
  ctx.font = font(f);
  while (ctx.measureText(text).width > max && f > min) { f -= 2; ctx.font = font(f); }
  return f;
}

function drawSpotlight(ctx, { scene, img, storyCrop, title, code, logo, q1, q2, find, family, pageFamily }) {
  const font = (px) => `900 ${px}px ${family}`;

  // the room, full bleed, with a soft light wash at the top for the question
  if (scene) {
    const a = W / H, ia = scene.width / scene.height;
    const [sw, sh] = ia > a ? [scene.height * a, scene.height] : [scene.width, scene.width / a];
    ctx.drawImage(scene, (scene.width - sw) / 2, (scene.height - sh) / 2, sw, sh, 0, 0, W, H);
  } else {
    ctx.fillStyle = "#f6efe6"; ctx.fillRect(0, 0, W, H);
  }
  const wash = ctx.createLinearGradient(0, 0, 0, 760);
  wash.addColorStop(0, "rgba(255,252,248,0.92)");
  wash.addColorStop(0.75, "rgba(255,252,248,0.55)");
  wash.addColorStop(1, "rgba(255,252,248,0)");
  ctx.fillStyle = wash; ctx.fillRect(0, 0, W, 760);

  drawHeader(ctx, { logo, family: pageFamily });
  heart(ctx, 930, 140, 96, 0.12, BRAND);
  rays(ctx, 1010, 120, BRAND, 1.2, 2, 26);

  // the question: a smaller first line, a big second one with a red swoosh
  ctx.save();
  ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = INK;
  fit(ctx, font, q1, 78, W - 110); ctx.fillText(q1, W / 2, 330);
  fit(ctx, font, q2, 92, W - 110); ctx.fillText(q2, W / 2, 452);
  const w2 = Math.min(ctx.measureText(q2).width, W - 200);
  ctx.strokeStyle = BRAND; ctx.lineWidth = 11; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(W / 2 - w2 * 0.5, 505); ctx.quadraticCurveTo(W / 2, 470, W / 2 + w2 * 0.5, 492); ctx.stroke();
  ctx.restore();
  rays(ctx, 1000, 520, "#f5b400", 0.7, 3, 30);

  // the seller's real photo in a white frame that takes its shape, a little tilted
  let fx = 80, fy = 620, fw = W - 160, fh = 800;
  const crop = img && (storyCrop
    ? { sx: storyCrop.x * img.width, sy: storyCrop.y * img.height, sw: storyCrop.w * img.width, sh: storyCrop.h * img.height }
    : smartCrop(img, (fw - 32) / (fh - 32)));
  if (crop) {
    const s = Math.min((fw - 32) / crop.sw, (fh - 32) / crop.sh);
    const w = crop.sw * s + 32, h = crop.sh * s + 32;
    fx += (fw - w) / 2; fy += (fh - h) / 2; fw = w; fh = h;
  }
  ctx.save();
  ctx.translate(fx + fw / 2, fy + fh / 2); ctx.rotate(-0.025); ctx.translate(-(fx + fw / 2), -(fy + fh / 2));
  ctx.shadowColor = "rgba(60,30,10,0.35)"; ctx.shadowBlur = 70; ctx.shadowOffsetY = 34;
  roundedRect(ctx, fx, fy, fw, fh, 48); ctx.fillStyle = "#fff"; ctx.fill();
  ctx.shadowColor = "transparent";
  roundedRect(ctx, fx + 16, fy + 16, fw - 32, fh - 32, 36);
  ctx.save(); ctx.clip();
  if (crop) {
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, fx + 16, fy + 16, fw - 32, fh - 32);
  } else {
    ctx.fillStyle = "#f6eee5"; ctx.fillRect(fx, fy, fw, fh);
  }
  ctx.restore();
  ctx.restore();
  rays(ctx, fx + 30, fy + 70, "#ffffff", -0.6, 3, 34);

  // the product's name in a red cloud on the frame's top corner
  if (title) {
    ctx.save();
    const fs = fit(ctx, font, title, 52, 560);
    const tw = ctx.measureText(title).width, bw = tw + 110, bh = Math.max(110, fs * 2.45);
    const bx = Math.min(W - 60 - bw / 2, fx + fw - bw * 0.32), by = fy;
    ctx.translate(bx, by); ctx.rotate(0.09);
    ctx.shadowColor = "rgba(200,0,55,0.4)"; ctx.shadowBlur = 36; ctx.shadowOffsetY = 14;
    ctx.fillStyle = BRAND;
    roundedRect(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fill();
    for (const [x, y, r] of [[-bw * 0.22, -bh * 0.42, bh * 0.36], [bw * 0.08, -bh * 0.5, bh * 0.4], [bw * 0.32, -bh * 0.36, bh * 0.31]]) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#fff"; ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(title, 0, 6);
    ctx.restore();
  }

  // "find it here", and under it the empty white bar for the link sticker
  ctx.save();
  ctx.fillStyle = INK; ctx.font = font(66); ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(255,255,255,0.9)"; ctx.shadowBlur = 24;
  ctx.fillText(find, W / 2, 1572);
  ctx.restore();
  const sw = 760, sh = 150, sx = (W - sw) / 2, sy = 1625;
  ctx.save();
  ctx.shadowColor = "rgba(60,30,10,0.25)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
  roundedRect(ctx, sx, sy, sw, sh, sh / 2); ctx.fillStyle = "#ffffff"; ctx.fill();
  ctx.restore();
  rays(ctx, sx - 46, sy + sh / 2, BRAND, -Math.PI / 2, 3, 26);
  rays(ctx, sx + sw + 46, sy + sh / 2, BRAND, Math.PI / 2, 3, 26);

  // the product code, small, at the bottom
  if (code) {
    ctx.save();
    ctx.direction = "ltr"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = INK_SOFT; ctx.font = `700 34px ${pageFamily}`;
    ctx.fillText(code, 72, H - 60);
    ctx.restore();
  }
}

/**
 * Draw a Spotlight story and return it as a PNG blob.
 *
 * @param {object} p
 * @param {string} p.title     product title, shown in the red cloud
 * @param {string} p.category  product category (picks the room and the question)
 * @param {string} [p.photo]   absolute image URL (R2)
 * @param {object} [p.storyCrop] admin-set framing ({ url, x, y, w, h }), used
 *                             only while `url` is this photo
 * @param {string} [p.code]    product code, e.g. "#26-0009"
 * @param {string} [p.locale]  language of the writing (default Kurdish)
 */
export async function buildSpotlightImage({ title, category, photo, storyCrop, code, locale = "ckb" }) {
  const [room, q] = SPOTLIGHT[category] ?? SPOTLIGHT.Other;
  const L = { locale };
  const q1 = m[`spotlight${q}1`]({}, L), q2 = m[`spotlight${q}2`]({}, L), find = m.spotlightFindHere({}, L);
  const crop = storyCrop && storyCrop.url === photo ? storyCrop : null;

  const [scene, img, logo, storyOk, spotOk] = await Promise.all([
    loadImage(`/spotlight/${room}.jpg`),
    loadImage(photo, { cors: true }),
    loadImage("/logo-mndallan.svg"),
    loadStoryFonts(),
    loadSpotFont(),
  ]);
  const page = getComputedStyle(document.body).fontFamily || "sans-serif";
  const pageFamily = storyOk ? `"${STORY_FONT}", ${page}` : page;
  // Noto Kufi for the Kurdish; Latin letters in a title fall back to the story font
  const family = spotOk ? `"${SPOT_FONT}", ${pageFamily}` : pageFamily;

  const render = (withPhoto) => {
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    drawSpotlight(ctx, { scene, img: withPhoto ? img : null, storyCrop: crop, title, code, logo, q1, q2, find, family, pageFamily });
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

// Renders a product as a 1080×1920 Instagram-Story card on a canvas.
//
// Instagram accepts no URL from the browser, but it *does* accept an image
// through the OS share sheet — `navigator.share({ files })` puts "Instagram →
// Stories" in the list. So the story path is: draw a card → share the PNG.
//
// Layout: the photo fills the screen (a wide one sits in a frame in the middle
// over a blurred copy of itself); the Mndallan header and the brand logo on
// top; a glossy badge with the condition (and «فرۆشگا» for store products)
// under the header; at the bottom a glass panel with the title, city and a big
// price; a white tap hint where the Instagram link sticker goes; the product
// code and web address.

import { brandLogo, brandLogoIsName } from "@/lib/brands";
import interLatin from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
import vazirmatnArabic from "@fontsource-variable/vazirmatn/files/vazirmatn-arabic-wght-normal.woff2?url";

const W = 1080;
const H = 1920;

const INK = "#0b0c0f";
const BRAND = "#ed0040";
const BRAND_LIGHT = "#ff1f58";
const BRAND_DARK = "#c80037";

// The story has its own font, shipped with the site, so it looks the same on
// iPhone and Android (the site itself uses each phone's system font): Inter
// for Latin letters and digits, Vazirmatn for Kurdish and Arabic.
const STORY_FONT = "MndallanStory";
let storyFonts;
function loadStoryFonts() {
  if (storyFonts) return storyFonts;
  const faces = [
    new FontFace(STORY_FONT, `url(${interLatin}) format("woff2")`, { weight: "100 900", unicodeRange: "U+0000-00FF, U+2000-206F, U+20AC, U+2212" }),
    new FontFace(STORY_FONT, `url(${vazirmatnArabic}) format("woff2")`, { weight: "100 900", unicodeRange: "U+0600-06FF, U+0750-077F, U+200C-200F, U+FB50-FDFF, U+FE70-FEFC" }),
  ];
  storyFonts = Promise.all(faces.map((f) => f.load().then((ff) => document.fonts.add(ff))))
    .then(() => true)
    .catch(() => (storyFonts = undefined, false));
  return storyFonts;
}

// Photos and category drawings live on R2, which sends CORS headers for the
// site, so they load with `crossOrigin` and the canvas stays exportable. The
// query string keeps the browser from reusing a copy cached without CORS.
// If that fails, the image is skipped instead of tainting the canvas.
function loadImage(src, { cors = false } = {}) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = cors && /^https?:/.test(src) ? `${src}${src.includes("?") ? "&" : "?"}story=1` : src;
  });
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Contain-fit: the whole image, centred, like `object-fit: contain`.
function drawContain(ctx, img, x, y, w, h) {
  const scale = Math.min(w / img.width, h / img.height);
  ctx.drawImage(img, x + (w - img.width * scale) / 2, y + (h - img.height * scale) / 2, img.width * scale, img.height * scale);
}

// The part of the photo to show in a frame of `aspect` (width / height).
// A photo wider or taller than the frame loses at most `maxCut` of that side;
// the frame then takes the shape of what is left.
//
// Where to cut: each pixel of a small copy is scored by how much it looks
// like the item rather than the background. The background is taken as the
// colour around the photo's border; a pixel scores for differing from it,
// for colour and for edges, with extra weight towards the middle, where
// sellers put the item. The window is centred on where that score lies, and
// if the item is wider than the window, less is cut so it is never sliced.
function smartCrop(img, aspect, maxCut = 0.3) {
  const ratio = img.width / img.height;
  const wide = ratio > aspect;
  const ideal = Math.max(1 - maxCut, wide ? aspect / ratio : ratio / aspect);
  if (ideal >= 0.999) return { sx: 0, sy: 0, sw: img.width, sh: img.height };

  const crop = (keep, start) => wide
    ? { sx: img.width * start, sy: 0, sw: img.width * keep, sh: img.height }
    : { sx: 0, sy: img.height * start, sw: img.width, sh: img.height * keep };
  const centred = (keep) => crop(keep, (1 - keep) / 2);

  const long = 96;
  const c = document.createElement("canvas");
  c.width = wide ? long : Math.max(8, Math.round(long * ratio));
  c.height = wide ? Math.max(8, Math.round(long / ratio)) : long;
  const cctx = c.getContext("2d", { willReadFrequently: true });
  let d;
  try {
    cctx.drawImage(img, 0, 0, c.width, c.height);
    d = cctx.getImageData(0, 0, c.width, c.height).data;
  } catch {
    return centred(ideal);
  }
  const cw = c.width, ch = c.height;
  const at = (x, y) => (y * cw + x) * 4;

  // background: the median colour of a 2-pixel ring around the border
  const ring = [[], [], []];
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (x > 1 && y > 1 && x < cw - 2 && y < ch - 2) continue;
      const i = at(x, y);
      for (let k = 0; k < 3; k++) ring[k].push(d[i + k]);
    }
  }
  const bg = ring.map((v) => v.sort((p, q) => p - q)[v.length >> 1]);

  // score per column (wide photo) or row (tall photo)
  const n = wide ? cw : ch;
  const profile = new Float32Array(n);
  const lum = (i) => d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
  for (let y = 1; y < ch; y++) {
    for (let x = 1; x < cw; x++) {
      const i = at(x, y);
      const dist = Math.hypot(d[i] - bg[0], d[i + 1] - bg[1], d[i + 2] - bg[2]) / 441;
      const sat = (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2])) / 255;
      const edge = Math.min(1, (Math.abs(lum(i) - lum(at(x - 1, y))) + Math.abs(lum(i) - lum(at(x, y - 1)))) / 60);
      const u = x / cw - 0.5, v = y / ch - 0.5;
      const middle = Math.exp(-(u * u + v * v) / (2 * 0.28 * 0.28));
      profile[wide ? x : y] += (0.5 * dist + 0.2 * sat + 0.3 * edge) * (0.35 + 0.65 * middle);
    }
  }
  // drop the even level that busy floors and walls add everywhere
  const base = [...profile].sort((p, q) => p - q)[Math.floor(n * 0.2)];
  let total = 0;
  for (let k = 0; k < n; k++) total += (profile[k] = Math.max(0, profile[k] - base));
  if (total <= 0) return centred(ideal);

  // where the item starts and ends: 6% and 94% of its score
  let acc = 0, from = 0, to = n;
  for (let k = 0; k < n; k++) {
    const next = acc + profile[k];
    if (acc < total * 0.06 && next >= total * 0.06) from = k / n;
    if (acc < total * 0.94 && next >= total * 0.94) to = (k + 1) / n;
    acc = next;
  }
  const keep = Math.min(1, Math.max(ideal, to - from + 0.06));
  const start = Math.min(1 - keep, Math.max(0, (from + to) / 2 - keep / 2));
  return crop(keep, start);
}

// A soft blur that works in every browser (iOS Safari has no canvas `filter`):
// the area is halved step by step, which averages it, then drawn back up.
function blurred(source, sx, sy, sw, sh, steps = 5) {
  let cur = source, cx = sx, cy = sy, cw = sw, ch = sh;
  for (let i = 0; i < steps; i++) {
    const c = document.createElement("canvas");
    c.width = Math.max(2, Math.round(cw / 2));
    c.height = Math.max(2, Math.round(ch / 2));
    const t = c.getContext("2d");
    if (!t) return null;
    t.imageSmoothingQuality = "high";
    t.drawImage(cur, cx, cy, cw, ch, 0, 0, c.width, c.height);
    cur = c; cx = 0; cy = 0; cw = c.width; ch = c.height;
  }
  return cur;
}

// An image recoloured to one colour at w×h, keeping its shape (the white logo).
function tinted(img, w, h, color) {
  const c = document.createElement("canvas");
  c.width = Math.round(w * 2);
  c.height = Math.round(h * 2);
  const t = c.getContext("2d");
  if (!t) return img;
  t.drawImage(img, 0, 0, c.width, c.height);
  t.globalCompositeOperation = "source-in";
  t.fillStyle = color;
  t.fillRect(0, 0, c.width, c.height);
  return c;
}

// Draws the part (sx, sy, sw, sh) of an image so it covers the box, centred.
function drawCover(ctx, img, { sx, sy, sw, sh }, x, y, w, h) {
  const s = Math.max(w / sw, h / sh);
  const cw = w / s, ch = h / s;
  ctx.drawImage(img, sx + (sw - cw) / 2, sy + (sh - ch) / 2, cw, ch, x, y, w, h);
}

// Words wrapped into lines no wider than maxWidth.
function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && ctx.measureText(`${last} ${word}`).width <= maxWidth) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}
const PIN_PATH = "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z";
const STORE_PATH = "M3 9l1-5h16l1 5M3 9v11h18V9M3 9h18M9 20v-6h6v6";

// A 24×24 outline icon (the site's SVG paths) drawn at `size` px.
function drawIcon(ctx, d, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke(new Path2D(d));
  ctx.restore();
}

// "SOLD · فرۆشرا" stamp, tilted, centred on (x, y): a red-outlined white
// badge with the English word large and the Kurdish under it. It sits in the
// middle of the photo.
function drawSoldStamp(ctx, { x, y, w, family }) {
  const h = w * 0.42, r = 28;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((10 * Math.PI) / 180);
  ctx.shadowColor = "rgba(90, 0, 25, 0.35)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  roundedRect(ctx, -w / 2, -h / 2, w, h, r);
  ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 12;
  ctx.strokeStyle = BRAND;
  ctx.stroke();
  roundedRect(ctx, -w / 2 + 18, -h / 2 + 18, w - 36, h - 36, r - 10);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = BRAND;
  ctx.direction = "ltr";
  ctx.font = `900 ${Math.round(h * 0.42)}px ${family}`;
  ctx.fillText("SOLD", 0, h * 0.06);
  ctx.direction = "rtl";
  ctx.font = `800 ${Math.round(h * 0.25)}px ${family}`;
  ctx.fillText("فرۆشرا", 0, h * 0.34);
  ctx.restore();
}

// A photo at most this wide (width / height) fills the whole story; a wider
// one sits in a frame in the middle over a blurred copy of itself.
export const STORY_FILL_MAX_ASPECT = 0.8;

function drawStory(ctx, { title, price, img, storyCrop, sold, city, condition, store, code, site, hint, rtl, logo, brand, brandImg, family }) {
  const pad = 64;

  // --- the glass panel's size, worked out first: the photo is laid out above it
  const bx = 48, bw = W - 96, inner = bw - 100;
  const t = (() => {
    for (let size = 60; size >= 48; size -= 4) {
      ctx.font = `800 ${size}px ${family}`;
      if (ctx.measureText(title ?? "").width <= inner) return { size, lines: [title ?? ""] };
    }
    for (let size = 56; size >= 44; size -= 4) {
      ctx.font = `800 ${size}px ${family}`;
      const lines = wrapLines(ctx, title ?? "", inner);
      if (lines.length <= 2 && lines.every((l) => ctx.measureText(l).width <= inner)) return { size, lines };
    }
    ctx.font = `800 44px ${family}`;
    const lines = wrapLines(ctx, title ?? "", inner).slice(0, 2);
    while (lines[1] && ctx.measureText(`${lines[1]}…`).width > inner) lines[1] = lines[1].slice(0, -1).trimEnd();
    if (lines[1] !== undefined) lines[1] = `${lines[1]}…`;
    return { size: 44, lines };
  })();
  const titleH = t.size * 1.18 * t.lines.length;
  const chipH = 64;
  const priceH = price ? 26 + 112 : 0;
  const panelH = 46 + titleH + 22 + chipH + priceH + 42;
  const by = H - 262 - panelH;

  // --- the photo
  ctx.fillStyle = "#1b1416";
  ctx.fillRect(0, 0, W, H);
  let photoBox = { x: 0, y: 0, w: W, h: by };
  if (img) {
    const part = storyCrop
      ? { sx: storyCrop.x * img.width, sy: storyCrop.y * img.height, sw: storyCrop.w * img.width, sh: storyCrop.h * img.height }
      : { sx: 0, sy: 0, sw: img.width, sh: img.height };
    ctx.imageSmoothingQuality = "high";
    if (part.sw / part.sh <= STORY_FILL_MAX_ASPECT) {
      // tall: fills the screen, trimmed around the item unless the admin framed it
      drawCover(ctx, img, storyCrop ? part : smartCrop(img, W / H, 0.5), 0, 0, W, H);
    } else {
      // wide: a blurred, darker copy fills the screen, the whole photo sits in a frame
      const back = blurred(img, part.sx, part.sy, part.sw, part.sh);
      if (back) {
        drawCover(ctx, back, { sx: 0, sy: 0, sw: back.width, sh: back.height }, -40, -40, W + 80, H + 80);
        ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
        ctx.fillRect(0, 0, W, H);
      }
      const top = 400, bottom = by - 40, roomW = W - 80, roomH = bottom - top;
      const s = Math.min(roomW / part.sw, roomH / part.sh);
      const fw = part.sw * s, fh = part.sh * s, fx = (W - fw) / 2, fy = top + (roomH - fh) / 2;
      photoBox = { x: fx, y: fy, w: fw, h: fh };
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
      ctx.shadowBlur = 60;
      ctx.shadowOffsetY = 24;
      roundedRect(ctx, fx, fy, fw, fh, 44);
      ctx.fillStyle = "#000000";
      ctx.fill();
      ctx.restore();
      ctx.save();
      roundedRect(ctx, fx, fy, fw, fh, 44);
      ctx.clip();
      ctx.drawImage(img, part.sx, part.sy, part.sw, part.sh, fx, fy, fw, fh);
      ctx.restore();
    }
  }
  if (sold) {
    // soften the photo a little so the stamp reads
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.fillRect(0, 0, W, H);
  }

  // shade the top and bottom so the white text reads on any photo
  let shade = ctx.createLinearGradient(0, 0, 0, 380);
  shade.addColorStop(0, "rgba(0, 0, 0, 0.45)");
  shade.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, 380);
  shade = ctx.createLinearGradient(0, H - 900, 0, H);
  shade.addColorStop(0, "rgba(20, 8, 12, 0)");
  shade.addColorStop(0.45, "rgba(20, 8, 12, 0.55)");
  shade.addColorStop(1, "rgba(20, 8, 12, 0.92)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, H - 900, W, 900);

  // --- header, the same in every language: Mndallan on the left, the brand on the right
  {
    const ix = 100, x = pad - 8, y = 62;
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 18;
    if (logo) ctx.drawImage(tinted(logo, ix, ix, "#ffffff"), x, y, ix, ix);
    ctx.direction = "ltr";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 50px ${family}`;
    ctx.fillText("Mndallan", x + ix + 20, y + 50);
    ctx.font = `600 29px ${family}`;
    ctx.fillText("Baby Marketplace", x + ix + 20, y + 90);
    ctx.restore();
  }
  if (brandImg) {
    // Symbol-only logos get the brand name beside them, as on the product page.
    const withName = !brandLogoIsName(brand);
    const lh = withName ? 46 : 54;
    const lw = Math.min(withName ? 64 : 240, (brandImg.width / brandImg.height) * lh);
    ctx.font = `800 34px ${family}`;
    const nameW = withName ? ctx.measureText(brand).width + 14 : 0;
    const ph = 104, pw = lw + nameW + 64, px = W - pad + 8 - pw, py = 60;
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    roundedRect(ctx, px, py, pw, ph, ph / 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
    drawContain(ctx, brandImg, px + 32, py + (ph - lh) / 2, lw, lh);
    if (withName) {
      ctx.save();
      ctx.direction = "ltr";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = INK;
      ctx.fillText(brand, px + 32 + lw + 14, py + ph / 2 + 2);
      ctx.restore();
    }
  }

  // --- badge under the header: a glossy red pill, tilted, with sparkles. It
  // shows the condition, and a store product says so too: «نوێ | فرۆشگا».
  const badge = [condition, store].filter(Boolean).join("  |  ");
  if (badge) {
    ctx.save();
    ctx.font = `900 58px ${family}`;
    const w = ctx.measureText(badge).width + 96, h = 104;
    ctx.translate(pad + 10 + w / 2, 300);
    ctx.rotate((-7 * Math.PI) / 180);
    ctx.shadowColor = "rgba(120, 0, 30, 0.5)";
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 14;
    roundedRect(ctx, -w / 2, -h / 2, w, h, h / 2);
    const fill = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    fill.addColorStop(0, BRAND_LIGHT);
    fill.addColorStop(1, BRAND_DARK);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.stroke();
    roundedRect(ctx, -w / 2 + 14, -h / 2 + 8, w - 28, h * 0.42, h * 0.21);
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.direction = rtl ? "rtl" : "ltr";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badge, 0, 6);
    const sparkle = (x, y, r) => {
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.quadraticCurveTo(x, y, x, y + r);
      ctx.quadraticCurveTo(x, y, x - r, y);
      ctx.quadraticCurveTo(x, y, x, y - r);
      ctx.fill();
    };
    ctx.shadowColor = "rgba(255, 31, 88, 0.9)";
    ctx.shadowBlur = 16;
    sparkle(w / 2 - 22, -h / 2 - 10, 26);
    sparkle(w / 2 + 14, -h / 2 + 30, 14);
    ctx.restore();
  }

  // --- glass panel: title, city, then the big price
  ctx.save();
  roundedRect(ctx, bx, by, bw, panelH, 48);
  ctx.clip();
  const frost = blurred(ctx.canvas, bx, by, bw, panelH, 4);
  if (frost) ctx.drawImage(frost, bx, by, bw, panelH);
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fillRect(bx, by, bw, panelH);
  const glow = ctx.createLinearGradient(0, by + panelH * 0.4, 0, by + panelH);
  glow.addColorStop(0, "rgba(237, 0, 64, 0)");
  glow.addColorStop(1, "rgba(237, 0, 64, 0.4)");
  ctx.fillStyle = glow;
  ctx.fillRect(bx, by, bw, panelH);
  ctx.restore();
  roundedRect(ctx, bx, by, bw, panelH, 48);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  const ex = rtl ? bx + bw - 50 : bx + 50; // the reading edge inside the panel
  ctx.save();
  ctx.direction = rtl ? "rtl" : "ltr";
  ctx.textAlign = rtl ? "right" : "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${t.size}px ${family}`;
  t.lines.forEach((line, i) => ctx.fillText(line, ex, by + 46 + t.size * 0.92 + i * t.size * 1.18));
  ctx.restore();

  // city chip on the reading side, a thin line running from it to the far side
  let y = by + 46 + titleH + 22;
  let chipW = 0;
  if (city) {
    ctx.save();
    ctx.font = `700 34px ${family}`;
    chipW = 26 + 34 + 10 + ctx.measureText(city).width + 28;
    const x = rtl ? ex - chipW : ex;
    roundedRect(ctx, x, y, chipW, chipH, chipH / 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    drawIcon(ctx, PIN_PATH, rtl ? x + chipW - 26 - 34 : x + 26, y + chipH / 2 - 17, 34, "#ffffff");
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.direction = rtl ? "rtl" : "ltr";
    ctx.textAlign = rtl ? "right" : "left";
    ctx.fillText(city, rtl ? x + chipW - 26 - 44 : x + 26 + 44, y + chipH / 2 + 2);
    ctx.restore();
  }
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  const lineW = bw - 100 - (chipW ? chipW + 26 : 0);
  ctx.fillRect(rtl ? bx + 50 : bx + bw - 50 - lineW, y + chipH / 2 - 1, lineW, 2);
  y += chipH + 26;

  // the price: big white number, red currency pill
  if (price) {
    const [, amount = price, unit = ""] = /^(.*?)(?:\s+([A-Za-z]{2,4}))?$/.exec(price) ?? [];
    ctx.save();
    ctx.direction = "ltr";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    let size = 124, aw, uw;
    const room = bw - 100;
    for (;; size -= 4) {
      ctx.font = `900 ${size}px ${family}`;
      aw = ctx.measureText(amount).width;
      ctx.font = `800 ${Math.round(size * 0.36)}px ${family}`;
      uw = unit ? ctx.measureText(unit).width + size * 0.36 : 0;
      if (aw + 24 + uw <= room || size <= 72) break;
    }
    const sx = bx + 50;
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${size}px ${family}`;
    ctx.fillText(amount, sx, y + 100);
    if (unit) {
      const uh = size * 0.58, ux = sx + aw + 24, uy = y + 100 - size * 0.36 - uh / 2;
      roundedRect(ctx, ux, uy, uw, uh, 18);
      ctx.fillStyle = BRAND;
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `800 ${Math.round(size * 0.36)}px ${family}`;
      ctx.textBaseline = "middle";
      ctx.fillText(unit, ux + size * 0.18, uy + uh / 2 + 2);
    }
    ctx.restore();
  }

  // --- tap hint: where the Instagram link sticker goes
  if (hint) {
    ctx.save();
    ctx.font = `800 38px ${family}`;
    const hw = ctx.measureText(hint).width + 72, hh = 80, hx = (W - hw) / 2, hy = H - 236;
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;
    roundedRect(ctx, hx, hy, hw, hh, hh / 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = INK;
    ctx.direction = rtl ? "rtl" : "ltr";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(hint, W / 2, hy + hh / 2 + 3);
    ctx.restore();
  }

  // --- footer: code on the left, web address on the right
  ctx.save();
  ctx.direction = "ltr";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 42px ${family}`;
  ctx.textAlign = "right";
  if (site) ctx.fillText(site, W - pad, H - 72);
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = `700 32px ${family}`;
  ctx.textAlign = "left";
  if (code) ctx.fillText(code, pad, H - 72);
  ctx.restore();

  if (sold) drawSoldStamp(ctx, { x: W / 2, y: photoBox.y + Math.min(photoBox.h, by) * 0.5, w: 520, family });
}

// The shape (width / height) of the story's photo when it fills the screen.
// The admin's story-crop tool uses it so a saved crop fills the story exactly;
// zooming out to a wider part puts the photo in the middle frame instead.
export const STORY_PHOTO_ASPECT = W / H;

/**
 * Draw the story card and return it as a PNG blob.
 *
 * @param {object} p
 * @param {string} p.title       product title
 * @param {string} [p.price]     formatted price, e.g. "50,000 IQD"
 * @param {boolean} [p.noPrice]  leave the price out (the link sticker tells it)
 * @param {string} [p.photo]     absolute image URL (R2)
 * @param {object} [p.storyCrop] admin-set framing of the photo ({ url, x, y, w, h }
 *                               as fractions); used only while `url` is this photo
 * @param {boolean} [p.sold]     put the SOLD stamp on it
 * @param {string} [p.city]      localized city
 * @param {string} [p.condition] localized condition, e.g. "وەک نوێ", for the badge
 * @param {string} [p.store]     localized "Store" label, for store products; joins the badge
 * @param {string} [p.code]      product code, e.g. "#26-0009"
 * @param {string} [p.site]      web address shown at the bottom, e.g. "www.mndallan.com"
 * @param {string} [p.hint]      text of the white pill where the link sticker goes
 * @param {boolean} [p.rtl]      right-to-left layout for ckb/ar
 * @param {string} [p.brand]     brand name; its logo goes in the header
 */
export async function buildStoryImage({ title, price, noPrice, photo, storyCrop, sold, city, condition, store, code, site, hint, rtl = false, brand }) {
  const crop = storyCrop && storyCrop.url === photo ? storyCrop : null;
  // Webfonts must be resolved before fillText or the card renders in a
  // fallback face (and Kurdish/Arabic glyphs may not render at all).
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* non-blocking */ }
  }

  const [img, logo, brandImg] = await Promise.all([
    loadImage(photo, { cors: true }),
    loadImage("/logo-mndallan.svg"),
    loadImage(brandLogo(brand)),
  ]);

  // the story font, with the page's own font behind it if it failed to load
  const pageFont = getComputedStyle(document.body).fontFamily || "sans-serif";
  const family = (await loadStoryFonts()) ? `"${STORY_FONT}", ${pageFont}` : pageFont;
  const render = (withPhoto) => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    drawStory(ctx, { title, price: noPrice ? undefined : price, img: withPhoto ? img : null, storyCrop: crop, sold, city, condition, store, code, site, hint, rtl, logo, brand, brandImg, family });
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
    // An image without CORS made the canvas unexportable: draw it again without
    // the photo rather than failing the share.
    const plain = render(false);
    return plain ? toBlob(plain) : null;
  }
}

/**
 * Build the card and hand it to the OS share sheet, where Instagram offers
 * "Stories". Falls back to downloading the PNG when the runtime cannot share
 * files (desktop Safari, Firefox, older Android WebViews).
 *
 * @returns {Promise<"shared" | "downloaded" | "failed">}
 */
export async function shareStoryImage(product) {
  let blob;
  try {
    blob = await buildStoryImage(product);
  } catch {
    return "failed";
  }
  if (!blob) return "failed";

  return shareStoryFiles([new File([blob], `${product.code || "product"}.png`, { type: "image/png" })]);
}

/**
 * Hand several story PNGs to the OS share sheet at once ("Save N Images" on
 * iPhone, Gallery on Android), or download them one by one where the runtime
 * cannot share files. Call it straight from a tap: iOS only opens the sheet
 * under a user gesture, so build the files beforehand.
 *
 * @param {File[]} files
 * @returns {Promise<"shared" | "downloaded" | "failed">}
 */
export async function shareStoryFiles(files) {
  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files });
      return "shared";
    } catch (err) {
      // A user-cancelled sheet is not a failure — do not fall back to a
      // surprise download in that case.
      if (err?.name === "AbortError") return "shared";
    }
  }

  try {
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }
    return "downloaded";
  } catch {
    return "failed";
  }
}

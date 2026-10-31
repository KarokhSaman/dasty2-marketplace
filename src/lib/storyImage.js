// Renders a product as a 1080×1920 Instagram-Story card on a canvas.
//
// Instagram accepts no URL from the browser, but it *does* accept an image
// through the OS share sheet — `navigator.share({ files })` puts "Instagram →
// Stories" in the list. So the story path is: draw a card → share the PNG.
//
// Layout: white page with very faint product drawings, Mndallan header and the brand logo on top, the
// photo trimmed towards the frame's shape in a frame that hugs it, and below it the designer's red
// card with its price tag tied on (public/story-card.png) holding the price, city/store and title;
// web address and code below it. If that art can't load, the card and a swing tag are drawn instead.

import { brandLogo, brandLogoIsName } from "@/lib/brands";
import { CATEGORY_CONFIG } from "@/lib/categories";
import interLatin from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
import vazirmatnArabic from "@fontsource-variable/vazirmatn/files/vazirmatn-arabic-wght-normal.woff2?url";

const W = 1080;
const H = 1920;

const INK = "#0b0c0f";
const INK_SOFT = "#61656e";
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

// An image recoloured to one colour, keeping its shape (white logo, white drawings).
function tinted(img, size, color) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const t = c.getContext("2d");
  if (!t) return img;
  drawContain(t, img, 0, 0, size, size);
  t.globalCompositeOperation = "source-in";
  t.fillStyle = color;
  t.fillRect(0, 0, size, size);
  return c;
}

// Title on up to two lines, shrinking until it fits; past that, the second
// line ends with "…".
function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && ctx.measureText(`${last} ${word}`).width <= maxWidth) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}
function wrapTitle(ctx, text, maxWidth, family) {
  for (let size = 72; size >= 52; size -= 4) {
    ctx.font = `800 ${size}px ${family}`;
    const lines = wrapLines(ctx, text, maxWidth);
    if (lines.length <= 2 && lines.every((l) => ctx.measureText(l).width <= maxWidth)) return { size, lines };
  }
  const size = 52;
  ctx.font = `800 ${size}px ${family}`;
  const lines = wrapLines(ctx, text, maxWidth).slice(0, 2);
  let second = lines[1] ?? "";
  const fits = (l) => ctx.measureText(`${l}…`).width <= maxWidth;
  while (second && !fits(second)) second = second.slice(0, -1).trimEnd();
  if (lines.length === 2) lines[1] = `${second}…`;
  return { size, lines };
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

// City chip (outlined) and, for store products, a white "Store" chip. Laid out
// from the reading edge, so it mirrors in Kurdish/Arabic.
function drawChips(ctx, { city, store, family, rtl, edge, top }) {
  const chips = [];
  ctx.font = `700 36px ${family}`;
  if (city) chips.push({ kind: "city", text: city, w: 28 + 38 + 12 + ctx.measureText(city).width + 30 });
  if (store) chips.push({ kind: "store", text: store, w: 28 + 38 + 12 + ctx.measureText(store).width + 30 });
  ctx.save();
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const h = 70;
  const mid = top + h / 2;
  let at = edge;
  for (const c of chips) {
    const x = rtl ? at - c.w : at;
    roundedRect(ctx, x, top, c.w, h, h / 2);
    if (c.kind === "city") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }
    const color = c.kind === "city" ? "#ffffff" : INK;
    const iconX = rtl ? x + c.w - 28 - 38 : x + 28;
    drawIcon(ctx, c.kind === "city" ? PIN_PATH : STORE_PATH, iconX, mid - 19, 38, color);
    ctx.fillStyle = color;
    ctx.fillText(c.text, rtl ? x + 30 : x + 28 + 38 + 12, mid + 2);
    at = rtl ? x - 18 : x + c.w + 18;
  }
  ctx.restore();
}

// Price tag: a white swing tag with a red outline, tilted a little, hung
// from the red card by a red cord through a metal eyelet near the card's
// corner. It hangs from the card's outer corner on its side, so in English
// (right side) it is drawn mirrored: eyelet on the right, button on the left,
// left end up; the price and the arrow still read normally. It always has the same width,
// sized for a six-digit price ("999,999 IQD"), so an Instagram link sticker
// fits over it every time; a longer price gets a smaller font instead. A
// trailing currency ("IQD") is drawn smaller and lighter than the number.
// `edge` is the x of the side it hangs from: its left end, or its right end
// when `fromRight`; `y` is its middle.
const TAG_TILT = (-6 * Math.PI) / 180;
const TAG_PRICE = "#5a0a1e";
function drawPriceBar(ctx, { edge, fromRight, y, price, family }) {
  const ph = 120, ar = 40, eyeX = 46, padStart = 88, gapToButton = 24, padEnd = 18;
  const split = (text) => /^(.*?)(?:\s+([A-Za-z]{2,4}))?$/.exec(text ?? "") ?? [];
  const [, amount = price ?? "", unit = ""] = split(price);
  let size = 62;
  const measure = (num, cur) => {
    ctx.font = `800 ${size}px ${family}`;
    const aw = ctx.measureText(num).width;
    ctx.font = `700 ${Math.round(size * 0.62)}px ${family}`;
    const uw = cur ? ctx.measureText(cur).width + size * 0.22 : 0;
    return { aw, uw, total: aw + uw };
  };
  // the room a six-digit price needs at full size sets the width for all
  const room = measure("999,999", unit || "IQD").total;
  const w = padStart + room + gapToButton + 2 * ar + padEnd;
  let m = measure(amount, unit);
  while (m.total > room && size > 30) { size -= 2; m = measure(amount, unit); }
  // Everything below is drawn in the tag's own frame: origin at the eyelet,
  // tilted with the tag, and flipped when it hangs from the right.
  const flip = fromRight ? -1 : 1;
  ctx.save();
  ctx.translate(edge + flip * eyeX, y);
  ctx.scale(flip, 1);
  ctx.rotate(TAG_TILT);
  const x0 = -eyeX, x1 = w - eyeX, top = -ph / 2;

  // tag body: square-ish at the eyelet end, round at the button end
  const body = new Path2D();
  const rl = 34, rr = ph / 2;
  body.moveTo(x0 + rl, top);
  body.lineTo(x1 - rr, top);
  body.arcTo(x1, top, x1, 0, rr);
  body.arcTo(x1, ph / 2, x1 - rr, ph / 2, rr);
  body.lineTo(x0 + rl, ph / 2);
  body.arcTo(x0, ph / 2, x0, ph / 2 - rl, rl);
  body.lineTo(x0, top + rl);
  body.arcTo(x0, top, x0 + rl, top, rl);
  body.closePath();
  ctx.save();
  ctx.shadowColor = "rgba(90, 0, 25, 0.38)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = "#ffffff";
  ctx.fill(body);
  ctx.restore();
  // a faint card-like shading, lighter at the top
  ctx.save();
  ctx.clip(body);
  const sheen = ctx.createLinearGradient(0, top, 0, ph / 2);
  sheen.addColorStop(0, "rgba(255, 255, 255, 0)");
  sheen.addColorStop(1, "rgba(120, 0, 30, 0.06)");
  ctx.fillStyle = sheen;
  ctx.fillRect(x0, top, w, ph);
  ctx.restore();
  ctx.lineWidth = 7;
  ctx.strokeStyle = BRAND;
  ctx.stroke(body);

  // eyelet: a metal ring with the hole showing through
  ctx.beginPath();
  ctx.arc(0, 0, 19, 0, Math.PI * 2);
  const ring = ctx.createLinearGradient(-19, -19, 19, 19);
  ring.addColorStop(0, "#f3f3f5");
  ring.addColorStop(0.5, "#b9bcc4");
  ring.addColorStop(1, "#8d9099");
  ctx.fillStyle = ring;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fillStyle = "#3a0612";
  ctx.fill();

  // The cord loops out of the eyelet and anchors just inside the red card.
  // Keep its lowest point above the city/store chips (drawChips starts at
  // cy + 58; this tag is centred at cy - 28, so the cord ends around cy + 26).
  // The two close strands create the small, realistic clothing-tag loop seen
  // in the reference without making the tag look like a floating button.
  const cord = (draw) => {
    ctx.beginPath();
    ctx.moveTo(-2, -4);
    ctx.bezierCurveTo(-38, -8, -58, 18, -40, 46);
    draw();
    ctx.beginPath();
    ctx.moveTo(4, 6);
    ctx.bezierCurveTo(-12, 18, -18, 34, -8, 54);
    draw();
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  cord(() => { ctx.lineWidth = 11; ctx.strokeStyle = "rgba(60, 0, 15, 0.35)"; ctx.stroke(); });
  cord(() => { ctx.lineWidth = 8; ctx.strokeStyle = "#ff5a7e"; ctx.stroke(); });
  cord(() => { ctx.lineWidth = 2.5; ctx.strokeStyle = "rgba(255, 255, 255, 0.55)"; ctx.stroke(); });

  // arrow button
  const ax = x1 - padEnd - ar;
  ctx.beginPath();
  ctx.arc(ax, 0, ar, 0, Math.PI * 2);
  const ag = ctx.createLinearGradient(ax, -ar, ax, ar);
  ag.addColorStop(0, BRAND_LIGHT);
  ag.addColorStop(1, BRAND_DARK);
  ctx.fillStyle = ag;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 8;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(ax - 7 * flip, -15);
  ctx.lineTo(ax + 8 * flip, 0);
  ctx.lineTo(ax - 7 * flip, 15);
  ctx.stroke();

  // the price, centred in the space between the eyelet and the button
  if (amount) {
    let start = (x0 + padStart + ax - ar - gapToButton) / 2 - m.total / 2;
    const base = size * 0.36;
    // flipped tag: undo the flip for the text so it reads left to right
    if (flip < 0) {
      ctx.scale(-1, 1);
      start = -(start + m.total);
    }
    ctx.direction = "ltr";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = TAG_PRICE;
    ctx.font = `800 ${size}px ${family}`;
    ctx.fillText(amount, start, base);
    if (unit) {
      ctx.fillStyle = INK_SOFT;
      ctx.font = `700 ${Math.round(size * 0.62)}px ${family}`;
      ctx.fillText(unit, start + m.aw + size * 0.22, base);
    }
  }
  ctx.restore();
}

// The red card with its price tag tied on, from the designer's art
// (public/story-card.png, 1200 × 480, transparent, with its own glow). Where things sit in the
// art, in its pixels: the card body (x, y, w, h), the centre of the tag's
// price area (x, y), and the tag's tilt in degrees and the room for the price.
const CARD_ART = {
  src: "/story-card.png",
  card: [21, 162, 1161, 253],
  price: [540, 125, -5.0, 520],
};

// The shape (width / height) of the photo inside its frame when the card art
// is used, as laid out in drawStory. The admin's story-crop tool uses it so a
// saved crop fills the frame exactly.
export const STORY_PHOTO_ASPECT = (() => {
  const cw = W - 144;
  const ch = Math.round(CARD_ART.card[3] * (cw / CARD_ART.card[2]));
  const ph = H - 140 - ch - 36 - 220;
  return (cw - 20) / (ph - 20);
})();

// The card art is drawn as is in Kurdish/Arabic (eyelet on the left, arrow
// pointing left) and flipped in English (eyelet on the right, arrow pointing
// right); the price, chips and title are written on it.
function drawCardArt(ctx, { art, CS, cx, cy, cw, ch, rtl, price, title, city, store, family }) {
  const A = CARD_ART;
  const ox = A.card[0] * CS, oy = A.card[1] * CS, iw = art.width * CS, ih = art.height * CS;
  ctx.save();
  if (rtl) ctx.drawImage(art, cx - ox, cy - oy, iw, ih);
  else {
    ctx.translate(cx + cw + ox, cy - oy);
    ctx.scale(-1, 1);
    ctx.drawImage(art, 0, 0, iw, ih);
  }
  ctx.restore();
  // price on the tag, centred between the eyelet and the button
  const ang = (A.price[2] * Math.PI) / 180;
  const tcx = rtl ? cx - ox + A.price[0] * CS : cx + cw + ox - A.price[0] * CS;
  const tcy = cy - oy + A.price[1] * CS;
  const roomW = A.price[3] * CS;
  const [, amount = price ?? "", unit = ""] = /^(.*?)(?:\s+([A-Za-z]{2,4}))?$/.exec(price ?? "") ?? [];
  let size = 60, aw, uw;
  const measure = () => {
    ctx.font = `800 ${size}px ${family}`; aw = ctx.measureText(amount).width;
    ctx.font = `700 ${Math.round(size * 0.62)}px ${family}`; uw = unit ? ctx.measureText(unit).width + size * 0.22 : 0;
    return aw + uw;
  };
  while (measure() > roomW && size > 30) size -= 2;
  ctx.save();
  ctx.translate(tcx, tcy);
  ctx.rotate(rtl ? ang : -ang);
  const start = -(aw + uw) / 2, base = size * 0.36;
  ctx.direction = "ltr"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#5a0a1e"; ctx.font = `800 ${size}px ${family}`; ctx.fillText(amount, start, base);
  if (unit) { ctx.fillStyle = INK_SOFT; ctx.font = `700 ${Math.round(size * 0.62)}px ${family}`; ctx.fillText(unit, start + aw + size * 0.22, base); }
  ctx.restore();

  // chips and title inside the shorter card
  const pad = 56;
  const chipTop = cy + 34;
  drawChipsSized(ctx, { city, store, family, rtl, edge: rtl ? cx + cw - pad : cx + pad, top: chipTop });
  const inner = cw - 2 * pad - 40;
  let tsize = 58, lines;
  for (; tsize >= 40; tsize -= 2) {
    ctx.font = `800 ${tsize}px ${family}`;
    lines = wrapLines(ctx, title ?? "", inner);
    const tall = tsize * 0.85 + (lines.length - 1) * tsize * 1.08;
    if (lines.length <= 2 && lines.every((l) => ctx.measureText(l).width <= inner) && chipTop + 58 + 22 + tall + 18 <= cy + ch) break;
  }
  lines = (lines ?? []).slice(0, 2);
  ctx.save();
  ctx.direction = rtl ? "rtl" : "ltr"; ctx.textAlign = rtl ? "right" : "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff"; ctx.font = `800 ${tsize}px ${family}`;
  const top = chipTop + 58 + 20;
  lines.forEach((line, i) => ctx.fillText(line, rtl ? cx + cw - pad : cx + pad, top + tsize * 0.85 + i * tsize * 1.08));
  ctx.restore();
}

// drawChips at a smaller size, for the shorter card
function drawChipsSized(ctx, opts) {
  ctx.save();
  const { top } = opts;
  ctx.translate(opts.rtl ? opts.edge : opts.edge, top);
  ctx.scale(0.83, 0.83);
  ctx.translate(-opts.edge, -top);
  drawChips(ctx, opts);
  ctx.restore();
}

// "SOLD · فرۆشرا" stamp, tilted, centred on (x, y): a red-outlined white
// badge with the English word large and the Kurdish under it. It sits on the
// photo's top-right corner.
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

function drawStory(ctx, { title, price, img, storyCrop, sold, city, store, code, site, rtl, logo, brand, brandImg, drawings, art, family }) {
  const edge = rtl ? W - 72 : 72;

  // Background: white, scattered with small, very faint baby-product
  // drawings (the site's category drawings).
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  if (drawings.length) {
    const size = 86, step = 150;
    const inks = drawings.map((d) => tinted(d, size, INK));
    let n = 0;
    for (let row = 0, y = -30; y < H; row++, y += step * 0.86) {
      for (let x = row % 2 ? -10 : -85; x < W; x += step, n++) {
        const turn = (((n * 37) % 11) - 5) * 0.06;
        ctx.save();
        ctx.globalAlpha = 0.035;
        ctx.translate(x + size / 2, y + size / 2);
        ctx.rotate(turn);
        ctx.drawImage(inks[(n * 5 + row) % inks.length], -size / 2, -size / 2);
        ctx.restore();
      }
    }
  }

  // Header, the same in every language: Mndallan on the left (the site's
  // logo, red name, grey tagline), the brand's logo on the right.
  if (logo) {
    const size = 100;
    const x = 64;
    ctx.drawImage(logo, x, 66, size, size);
    ctx.save();
    ctx.direction = "ltr";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const tx = x + size + 20;
    ctx.fillStyle = BRAND;
    ctx.font = `bold 48px ${family}`;
    ctx.fillText("Mndallan", tx, 116);
    ctx.fillStyle = INK_SOFT;
    ctx.font = `500 28px ${family}`;
    ctx.fillText("Baby Marketplace", tx, 152);
    ctx.restore();
  }
  if (brandImg) {
    // Symbol-only logos get the brand name beside them, as on the product page.
    const withName = !brandLogoIsName(brand);
    const lh = withName ? 50 : 58;
    const lw = Math.min(withName ? 70 : 260, (brandImg.width / brandImg.height) * lh);
    ctx.font = `800 36px ${family}`;
    const nameW = withName ? ctx.measureText(brand).width + 16 : 0;
    const pw = lw + nameW + 60;
    const ph = lh + 28;
    const px = W - 72 - pw;
    const py = 116 - ph / 2;
    ctx.save();
    ctx.shadowColor = "rgba(11, 12, 15, 0.18)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    roundedRect(ctx, px, py, pw, ph, ph / 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
    drawContain(ctx, brandImg, px + 30, py + (ph - lh) / 2, lw, lh);
    if (withName) {
      ctx.save();
      ctx.direction = "ltr";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = INK;
      ctx.fillText(brand, px + 30 + lw + 16, py + ph / 2 + 2);
      ctx.restore();
    }
  }


  // Photo: in a white frame that takes the (trimmed) photo's shape.
  // Red card: just tall enough for the chips and the title; the web address
  // and product code sit below it on the cream.
  // With the card art, the card lines up with the photo frame's edges and
  // takes the art's shape.
  const cx = art ? 72 : 48, cw = art ? W - 144 : W - 96, cr = 64;
  const inner = cw - 120;
  const t = wrapTitle(ctx, title ?? "", inner, family);
  const titleTop = 158;
  const CS = art ? cw / CARD_ART.card[2] : 1;
  const ch = art ? Math.round(CARD_ART.card[3] * CS) : Math.round(titleTop + t.size * 0.85 + (t.lines.length - 1) * t.size * 1.1 + t.size * 0.25 + 56);
  const cy = H - 140 - ch;

  // Photo fills the space down to just above the card. A landscape or
  // portrait photo is trimmed towards the frame's shape (or as the admin
  // framed it), then the frame shrinks around it, centred in that space.
  let px = 72, py = 220, pw = W - 144, ph = cy - 36 - py;
  const pr = 56;
  const crop = img && (storyCrop
    ? { sx: storyCrop.x * img.width, sy: storyCrop.y * img.height, sw: storyCrop.w * img.width, sh: storyCrop.h * img.height }
    : smartCrop(img, (pw - 20) / (ph - 20)));
  if (crop) {
    const s = Math.min((pw - 20) / crop.sw, (ph - 20) / crop.sh);
    const fw = crop.sw * s + 20, fh = crop.sh * s + 20;
    px += (pw - fw) / 2; py += (ph - fh) / 2; pw = fw; ph = fh;
  }
  ctx.save();
  ctx.shadowColor = "rgba(11, 12, 15, 0.28)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 26;
  roundedRect(ctx, px, py, pw, ph, pr);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundedRect(ctx, px + 10, py + 10, pw - 20, ph - 20, pr - 10);
  ctx.clip();
  if (crop) {
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, px + 10, py + 10, pw - 20, ph - 20);
  } else {
    ctx.fillStyle = "#f6eee5";
    ctx.fillRect(px, py, pw, ph);
  }
  if (sold) {
    // soften the photo a little so the stamp reads
    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    ctx.fillRect(px, py, pw, ph);
  }
  ctx.restore();
  // the stamp sits on the photo's top-right corner, inside the story's edge
  if (sold) {
    const sw = 440;
    drawSoldStamp(ctx, { x: px + pw - sw * 0.5, y: py + sw * 0.16, w: sw, family });
  }

  if (art) {
    // on a sold story the card and price tag fade back so the stamp leads
    ctx.save();
    if (sold) ctx.globalAlpha = 0.4;
    drawCardArt(ctx, { art, CS, cx, cy, cw, ch, rtl, price, title, city, store, family });
    ctx.restore();
  } else {
  ctx.save();
  ctx.shadowColor = "rgba(120, 0, 30, 0.45)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  roundedRect(ctx, cx, cy, cw, ch, cr);
  const grad = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch);
  grad.addColorStop(0, BRAND_LIGHT);
  grad.addColorStop(0.5, BRAND);
  grad.addColorStop(1, BRAND_DARK);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  // Category drawings, white and faint, as the card's pattern.
  ctx.save();
  roundedRect(ctx, cx, cy, cw, ch, cr);
  ctx.clip();
  const spots = [[cx + 700, cy - 30, -0.2], [cx - 50, cy + 170, 0.24], [cx + 540, cy + 330, 0.14], [cx + 250, cy + 400, -0.3]];
  drawings.slice(0, spots.length).forEach((d, i) => {
    const [x, y, a] = spots[i % spots.length];
    const tmp = tinted(d, 220, "#ffffff");
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.translate(x + 110, y + 110);
    ctx.rotate(a);
    ctx.drawImage(tmp, -110, -110);
    ctx.restore();
  });
  ctx.restore();

  // Card content: chips, then the title.
  drawChips(ctx, { city, store, family, rtl, edge: rtl ? cx + cw - 60 : cx + 60, top: cy + 58 });
  ctx.save();
  ctx.direction = rtl ? "rtl" : "ltr";
  ctx.textAlign = rtl ? "right" : "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${t.size}px ${family}`;
  t.lines.forEach((line, i) => ctx.fillText(line, rtl ? cx + cw - 60 : cx + 60, cy + titleTop + t.size * 0.85 + i * t.size * 1.1));
  ctx.restore();
  }

  // Below the card, on the cream: web address and product code.
  const footY = H - 66;
  ctx.save();
  ctx.direction = "ltr";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK;
  ctx.font = `600 44px ${family}`;
  ctx.textAlign = rtl ? "right" : "left";
  if (site) ctx.fillText(site, rtl ? cx + cw - 24 : cx + 24, footY);
  ctx.fillStyle = INK_SOFT;
  ctx.font = `700 32px ${family}`;
  ctx.textAlign = rtl ? "left" : "right";
  if (code) ctx.fillText(code, rtl ? cx + 24 : cx + cw - 24, footY);
  ctx.restore();

  // Price bar on the photo's bottom edge, just above the card, on the
  // reading side (left in Kurdish/Arabic, right in English).
  if (!art) drawPriceBar(ctx, { edge: rtl ? cx + 24 : cx + cw - 24, fromRight: !rtl, y: cy - 2, price, family });
}

/**
 * Draw the story card and return it as a PNG blob.
 *
 * @param {object} p
 * @param {string} p.title      product title
 * @param {string} [p.price]    formatted price, e.g. "50,000 IQD", shown on the tag
 * @param {string} [p.photo]    absolute image URL (R2)
 * @param {string} [p.city]     localized city
 * @param {string} [p.store]    localized "Store" label, for store products
 * @param {string} [p.code]     product code, e.g. "#26-0009"
 * @param {string} [p.site]     web address shown on the card, e.g. "www.mndallan.com"
 * @param {boolean} [p.rtl]     right-to-left layout for ckb/ar
 * @param {string} [p.brand]    brand name; its logo goes in the header
 * @param {object} [p.storyCrop] admin-set framing of the photo ({ url, x, y, w, h }
 *                              as fractions); used only while `url` is this photo
 */
export async function buildStoryImage({ title, price, photo, storyCrop, sold, city, store, code, site, rtl = false, brand }) {
  const crop = storyCrop && storyCrop.url === photo ? storyCrop : null;
  // Webfonts must be resolved before fillText or the card renders in a
  // fallback face (and Kurdish/Arabic glyphs may not render at all).
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* non-blocking */ }
  }

  const drawingUrls = CATEGORY_CONFIG.filter((c) => c.value !== "all").map((c) => c.img);
  const [img, logo, art, brandImg, ...drawings] = await Promise.all([
    loadImage(photo, { cors: true }),
    loadImage("/logo-mndallan.svg"),
    loadImage(CARD_ART.src),
    loadImage(brandLogo(brand)),
    ...drawingUrls.map((u) => loadImage(u, { cors: true })),
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
    drawStory(ctx, { title, price, img: withPhoto ? img : null, storyCrop: crop, sold, city, store, code, site, rtl, logo, brand, brandImg, drawings: withPhoto ? drawings.filter(Boolean) : [], art, family });
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
    // the photo and drawings rather than failing the share.
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

  const file = new File([blob], `${product.code || "product"}.png`, { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return "shared";
    } catch (err) {
      // A user-cancelled sheet is not a failure — do not fall back to a
      // surprise download in that case.
      if (err?.name === "AbortError") return "shared";
    }
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return "downloaded";
  } catch {
    return "failed";
  }
}

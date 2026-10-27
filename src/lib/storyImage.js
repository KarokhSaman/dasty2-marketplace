// Renders a product as a 1080×1920 Instagram-Story card on a canvas.
//
// Instagram accepts no URL from the browser, but it *does* accept an image
// through the OS share sheet — `navigator.share({ files })` puts "Instagram →
// Stories" in the list. So the story path is: draw a card → share the PNG.
//
// Layout: cream page with faint product drawings, Mndallan header and the brand logo on top, the whole
// photo framed over a blurred copy of itself, an empty red hang tag (where the
// seller puts Instagram's link sticker; no price on purpose), and a red card
// with the category drawings, city/store and title; web address and code below it.

import { brandLogo, brandLogoIsName } from "@/lib/brands";
import { CATEGORY_CONFIG } from "@/lib/categories";

const W = 1080;
const H = 1920;

const INK = "#0b0c0f";
const PAPER = "#fefcf9";
const INK_SOFT = "#61656e";
const BRAND = "#ed0040";
const BRAND_LIGHT = "#ff1f58";
const BRAND_DARK = "#c80037";

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

// Cover-fit: fill the box, cropping the overflow like `object-fit: cover`.
function drawCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  ctx.drawImage(img, x + (w - img.width * scale) / 2, y + (h - img.height * scale) / 2, img.width * scale, img.height * scale);
}

// Contain-fit: the whole image, centred, like `object-fit: contain`.
function drawContain(ctx, img, x, y, w, h) {
  const scale = Math.min(w / img.width, h / img.height);
  ctx.drawImage(img, x + (w - img.width * scale) / 2, y + (h - img.height * scale) / 2, img.width * scale, img.height * scale);
}

// A soft blur of the photo for the empty space around a landscape or portrait
// photo. Drawn small and scaled up, which blurs on every browser (Safari has
// no canvas `filter`).
function drawBlurred(ctx, img, x, y, w, h) {
  const small = document.createElement("canvas");
  small.width = 24;
  small.height = Math.max(1, Math.round((24 * h) / w));
  const sctx = small.getContext("2d");
  if (!sctx) return;
  drawCover(sctx, img, 0, 0, small.width, small.height);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, x - 40, y - 40, w + 80, h + 80);
  ctx.fillStyle = "rgba(254, 252, 249, 0.12)";
  ctx.fillRect(x, y, w, h);
  ctx.restore();
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

// Title on up to two lines, shrinking until it fits; the last line gets "…".
function wrapTitle(ctx, text, maxWidth, family) {
  for (let size = 72; size >= 48; size -= 4) {
    ctx.font = `800 ${size}px ${family}`;
    const words = text.split(/\s+/);
    const lines = [""];
    for (const word of words) {
      const next = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth || !lines[lines.length - 1]) lines[lines.length - 1] = next;
      else lines.push(word);
    }
    if (lines.length <= 2 && lines.every((l) => ctx.measureText(l).width <= maxWidth)) return { size, lines };
  }
  ctx.font = `800 48px ${family}`;
  let line = text;
  while (line.length > 1 && ctx.measureText(`${line}…`).width > maxWidth * 2) line = line.slice(0, -1);
  return { size: 48, lines: [line.length < text.length ? `${line}…` : line] };
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

// An empty red hang tag: the spot for Instagram's link sticker (the price is
// left off on purpose). Its hole sits on the red card's top corner on the end
// side, tied by a short white string, and it tilts 15° up toward the photo.
// Mirrored in Kurdish/Arabic.
const TAG_TILT = (15 * Math.PI) / 180;
function drawHangTag(ctx, { hx, hy, w, h, rtl }) {
  const tilt = TAG_TILT;
  const half = h / 2;
  const point = 58;

  // the short string, from the hole over the card's corner
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.bezierCurveTo(hx + (rtl ? -36 : 36), hy + 4, hx + (rtl ? -40 : 40), hy + 44, hx + (rtl ? -14 : 14), hy + 60);
  ctx.stroke();
  ctx.restore();

  // the tag, drawn with its hole at (0, 0) and its body reaching back (−x)
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(rtl ? -tilt : tilt);
  if (rtl) ctx.scale(-1, 1);
  const left = -(w - point), r = 24;
  const tag = new Path2D();
  tag.moveTo(left + r, -half);
  tag.lineTo(0, -half);
  tag.lineTo(point, 0);
  tag.lineTo(0, half);
  tag.lineTo(left + r, half);
  tag.arcTo(left, half, left, half - r, r);
  tag.lineTo(left, -half + r);
  tag.arcTo(left, -half, left + r, -half, r);
  tag.closePath();
  ctx.shadowColor = "rgba(60, 0, 15, 0.45)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  const grad = ctx.createLinearGradient(left, -half, point, half);
  grad.addColorStop(0, BRAND_LIGHT);
  grad.addColorStop(1, BRAND_DARK);
  ctx.fillStyle = grad;
  ctx.fill(tag);
  ctx.shadowColor = "transparent";
  // stitched edge
  ctx.setLineDash([12, 10]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.lineWidth = 3;
  roundedRect(ctx, left + 14, -half + 14, -left - 14 - 20, h - 28, 14);
  ctx.stroke();
  ctx.setLineDash([]);
  // hole with a white eyelet
  ctx.beginPath();
  ctx.arc(14, 0, 18, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(14, 0, 10, 0, Math.PI * 2);
  ctx.fillStyle = BRAND_DARK;
  ctx.fill();
  ctx.restore();
}

// "Click here" hand on the tag (sellers write "to know the price, click
// here" on it): a tapping hand with click rays ("click here" icon by Cuputo,
// Noun Project), its fingertip touching the tag's free end. The drawing points
// up-left; `dir` -1 mirrors it to point up-right.
const HAND_RAYS = [
  "M47.815,25.184c-0.224,0.017-0.438,0.084-0.63,0.193l-4.167,2.391c-0.699,0.375-0.943,1.25-0.553,1.933c0.391,0.688,1.272,0.917,1.948,0.505l4.178-2.386C49.918,27.096,49.32,25.074,47.815,25.184z",
  "M25.935,37.71c-0.219,0.017-0.432,0.083-0.62,0.197l-4.178,2.386c-0.692,0.376-0.943,1.25-0.546,1.938c0.391,0.682,1.27,0.911,1.948,0.504l4.172-2.386C28.039,39.623,27.445,37.601,25.935,37.71z",
  "M27.278,19.71c-1.073,0.037-1.713,1.219-1.156,2.135l2.41,4.141c0.392,0.673,1.251,0.902,1.923,0.511c0.676-0.391,0.9-1.256,0.509-1.928l-2.406-4.135C28.298,19.971,27.804,19.695,27.278,19.71z",
  "M38.706,18.195c-0.615,0.032-1.14,0.458-1.292,1.052l-1.25,4.636c-0.229,0.755,0.219,1.558,0.984,1.76c0.765,0.208,1.546-0.26,1.734-1.03l1.246-4.626C40.393,19.06,39.669,18.153,38.706,18.195z",
  "M20.284,28.793c-1.636,0.052-1.885,2.376-0.297,2.772l4.645,1.233c0.767,0.24,1.579-0.202,1.787-0.979c0.209-0.776-0.281-1.567-1.063-1.739l-4.656-1.23C20.565,28.81,20.424,28.793,20.284,28.793z",
];
const HAND_INSIDE = "M34.101,32.637c1.005-0.552,2.104-0.354,2.552,0.459l9.208,16.697c0.771,1.578,3.115,0.287,2.193-1.203l-1.682-3.047c-1.151-2.088,2.469-3.854,3.521-1.942l1.323,2.396c0.771,1.577,3.115,0.286,2.193-1.204L52.7,43.512c-0.255-0.463-0.238-1.078,0.161-1.671c0.402-0.595,1.136-1,1.855-1.026c0.713-0.021,1.246,0.297,1.495,0.745l0.917,1.667c0.807,1.463,3.004,0.249,2.197-1.215l-0.35-0.624c-0.203-0.371-0.317-0.735-0.15-1.142c0.234-0.547,0.917-0.927,1.51-0.953c0.594-0.02,0.907,0.095,1.224,0.646c1.495,2.583,4.323,7.834,4.323,7.834c2.355,4.307,3.162,8.134,2.479,11.322c-0.681,3.188-2.822,5.901-6.437,7.885c-3.609,1.979-6.14,2.511-8.463,2.246c-2.319-0.268-4.5-1.35-6.762-3.104L33.591,55.946c-0.678-0.532-0.916-1.104,0.109-1.746c1.073-0.683,2.485,0,3.506,0.495c0.032,0.021,5.854,3.079,5.854,3.079c1.094,0.546,2.25-0.643,1.662-1.714L33.132,35.039C32.528,33.951,33.206,33.131,34.101,32.637z";
const HAND_OUTSIDE = "M32.888,30.44c-0.662,0.364-1.234,0.88-1.667,1.525c-0.869,1.287-1.021,2.938-0.281,4.281l9.62,17.432l-1.5-0.765c-0.912-0.521-3.027-1.416-4.308-1.433c-1.327,0.006-2.5,0.49-3.312,1.225c-1.298,1.172-1.479,2.385-0.703,3.786c0.578,1.047,1.572,1.673,2.338,2.266l12.099,9.35c2.479,1.916,5.088,3.276,8,3.609c2.905,0.333,6.036-0.392,9.448-2.333c4.552-2.428,7.333-5.793,8.181-9.761c0.855-3.979-0.192-8.412-2.733-13.058l-4.319-7.833c-0.681-1.234-2.063-1.964-3.473-1.849c-2.068,0.166-3.084,1.005-3.693,2.479c-1.014-1.006-2.27-1.068-3.593-0.626c-1.24,0.423-1.854,1.193-2.459,2.131c-0.661-0.364-1.432-0.547-2.218-0.525c-1.484,0.047-2.854,0.776-3.73,1.963l-5.744-10.416c-0.74-1.345-2.219-2.095-3.771-2.047C34.294,29.861,33.549,30.075,32.888,30.44z";
function drawClickHint(ctx, { x, y, dir }) {
  const s = 3;
  ctx.save();
  // (x, y) is the fingertip, at (32.6, 31) in the drawing
  ctx.translate(x, y);
  ctx.scale(dir * s, s);
  ctx.translate(-32.6, -31);
  ctx.fillStyle = INK;
  for (const d of HAND_RAYS) ctx.fill(new Path2D(d));
  ctx.shadowColor = "rgba(11, 12, 15, 0.3)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = "#ffffff";
  ctx.fill(new Path2D(HAND_OUTSIDE));
  ctx.shadowColor = "transparent";
  const outline = new Path2D(HAND_OUTSIDE);
  outline.addPath(new Path2D(HAND_INSIDE));
  ctx.fillStyle = INK;
  ctx.fill(outline, "evenodd");
  ctx.restore();
}

function drawStory(ctx, { title, img, city, store, code, site, rtl, logo, brand, brandImg, drawings, family }) {
  const edge = rtl ? W - 72 : 72;

  // Background: the site's cream, scattered with small faint baby-product
  // drawings (the site's category drawings).
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  if (drawings.length) {
    const size = 86, step = 150;
    const inks = drawings.map((d) => tinted(d, size, INK));
    let n = 0;
    for (let row = 0, y = -30; y < H; row++, y += step * 0.86) {
      for (let x = row % 2 ? -10 : -85; x < W; x += step, n++) {
        const turn = (((n * 37) % 11) - 5) * 0.06;
        ctx.save();
        ctx.globalAlpha = 0.07;
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


  // Photo: the whole photo, over a blur of itself, in a white frame.
  const px = 72, py = 220, pw = W - 144, ph = 990, pr = 56;
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
  if (img) {
    drawBlurred(ctx, img, px + 10, py + 10, pw - 20, ph - 20);
    drawContain(ctx, img, px + 10, py + 10, pw - 20, ph - 20);
  } else {
    ctx.fillStyle = "#f6eee5";
    ctx.fillRect(px, py, pw, ph);
  }
  ctx.restore();

  // Red card: just tall enough for the chips and the title; the web address
  // and product code sit below it on the cream.
  const cx = 48, cw = W - 96, cr = 64;
  const inner = cw - 120;
  const t = wrapTitle(ctx, title ?? "", inner - 170, family); // room for the hand
  const titleTop = 158;
  const ch = Math.round(titleTop + t.size * 0.85 + (t.lines.length - 1) * t.size * 1.1 + t.size * 0.25 + 56);
  const cy = H - 140 - ch;
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
  ctx.font = `700 32px ui-monospace, Menlo, monospace`;
  ctx.textAlign = rtl ? "left" : "right";
  if (code) ctx.fillText(code, rtl ? cx + 24 : cx + cw - 24, footY);
  ctx.restore();

  // Empty hang tag with its hole on the card's top corner (end side), tilted
  // 15° up toward the photo. The "click here" hand sits by the hole end, on
  // the card, its fingertip on the tag's lower edge.
  const tw = 540, th = 140;
  const hx = rtl ? cx + 70 : cx + cw - 70, hy = cy + 40;
  drawHangTag(ctx, { hx, hy, w: tw, h: th, rtl });
  const lx = (rtl ? 1 : -1) * 90, ly = th / 2 + 4;
  const a = rtl ? -TAG_TILT : TAG_TILT;
  drawClickHint(ctx, {
    x: hx + lx * Math.cos(a) - ly * Math.sin(a),
    y: hy + lx * Math.sin(a) + ly * Math.cos(a),
    dir: rtl ? -1 : 1,
  });
}

/**
 * Draw the story card and return it as a PNG blob.
 *
 * @param {object} p
 * @param {string} p.title      product title
 * @param {string} [p.photo]    absolute image URL (R2)
 * @param {string} [p.city]     localized city
 * @param {string} [p.store]    localized "Store" label, for store products
 * @param {string} [p.code]     product code, e.g. "#26-0009"
 * @param {string} [p.site]     web address shown on the card, e.g. "www.mndallan.com"
 * @param {boolean} [p.rtl]     right-to-left layout for ckb/ar
 * @param {string} [p.brand]    brand name; its logo goes in the header
 */
export async function buildStoryImage({ title, photo, city, store, code, site, rtl = false, brand }) {
  // Webfonts must be resolved before fillText or the card renders in a
  // fallback face (and Kurdish/Arabic glyphs may not render at all).
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* non-blocking */ }
  }

  const drawingUrls = CATEGORY_CONFIG.filter((c) => c.value !== "all").map((c) => c.img);
  const [img, logo, brandImg, ...drawings] = await Promise.all([
    loadImage(photo, { cors: true }),
    loadImage("/logo-mndallan.svg"),
    loadImage(brandLogo(brand)),
    ...drawingUrls.map((u) => loadImage(u, { cors: true })),
  ]);

  const family = getComputedStyle(document.body).fontFamily || "sans-serif";
  const render = (withPhoto) => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    drawStory(ctx, { title, img: withPhoto ? img : null, city, store, code, site, rtl, logo, brand, brandImg, drawings: withPhoto ? drawings.filter(Boolean) : [], family });
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

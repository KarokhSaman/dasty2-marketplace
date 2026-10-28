// Renders a product as a 1080×1920 Instagram-Story card on a canvas.
//
// Instagram accepts no URL from the browser, but it *does* accept an image
// through the OS share sheet — `navigator.share({ files })` puts "Instagram →
// Stories" in the list. So the story path is: draw a card → share the PNG.
//
// Layout: cream page with faint product drawings, Mndallan header and the brand logo on top, the whole
// photo framed over a blurred copy of itself, a sunset-coloured hang tag with the price on
// its white label, and a red card
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

// A sunset-coloured hang tag with the price on its white label. Its hole sits on the red
// card's top corner on the end
// side, tied by a short white string, and it tilts 15° up toward the photo.
// Mirrored in Kurdish/Arabic.
const TAG_TILT = (15 * Math.PI) / 180;
// Sunset blend along the tag (orange, pink, purple), price in deep pink.
const TAG_COLORS = ["#ff8a3d", "#f2365f", "#a21caf"];
const TAG_PRICE = "#c2185b";
function drawHangTag(ctx, { hx, hy, w, h, rtl, price, family }) {
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
  ctx.shadowColor = "rgba(80, 10, 40, 0.45)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  const grad = ctx.createLinearGradient(left, -half, point, half);
  TAG_COLORS.forEach((c, i) => grad.addColorStop(i / (TAG_COLORS.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fill(tag);
  ctx.shadowColor = "transparent";
  // white inside; the tag's red edge frames it
  roundedRect(ctx, left + 14, -half + 14, -left - 14 - 20, h - 28, 14);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  // the price on the white label, unmirrored so it reads normally in RTL
  if (price) {
    const boxW = -left - 34 - 40;
    ctx.save();
    ctx.translate((left + 14 + -20) / 2, 0);
    if (rtl) ctx.scale(-1, 1);
    ctx.direction = "ltr";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = TAG_PRICE;
    let size = 64;
    do { ctx.font = `800 ${size}px ${family}`; size -= 2; } while (ctx.measureText(price).width > boxW && size > 30);
    ctx.fillText(price, 0, 3);
    ctx.restore();
  }
  // hole with a white eyelet
  ctx.beginPath();
  ctx.arc(14, 0, 18, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(14, 0, 10, 0, Math.PI * 2);
  ctx.fillStyle = TAG_COLORS[TAG_COLORS.length - 1];
  ctx.fill();
  ctx.restore();
}

function drawStory(ctx, { title, price, img, city, store, code, site, rtl, logo, brand, brandImg, drawings, family }) {
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
  // Red card: just tall enough for the chips and the title; the web address
  // and product code sit below it on the cream.
  const cx = 48, cw = W - 96, cr = 64;
  const inner = cw - 120;
  const t = wrapTitle(ctx, title ?? "", inner, family);
  const titleTop = 158;
  const ch = Math.round(titleTop + t.size * 0.85 + (t.lines.length - 1) * t.size * 1.1 + t.size * 0.25 + 56);
  const cy = H - 140 - ch;

  // Photo fills the space down to just above the card.
  const px = 72, py = 220, pw = W - 144, ph = cy - 36 - py, pr = 56;
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
  // 15° up toward the photo.
  const tw = 540, th = 140;
  const hx = rtl ? cx + 70 : cx + cw - 70, hy = cy + 40;
  drawHangTag(ctx, { hx, hy, w: tw, h: th, rtl, price, family });
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
 */
export async function buildStoryImage({ title, price, photo, city, store, code, site, rtl = false, brand }) {
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
    drawStory(ctx, { title, price, img: withPhoto ? img : null, city, store, code, site, rtl, logo, brand, brandImg, drawings: withPhoto ? drawings.filter(Boolean) : [], family });
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

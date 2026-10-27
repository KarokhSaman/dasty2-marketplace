// Renders a product as a 1080×1920 Instagram-Story card on a canvas.
//
// Instagram accepts no URL from the browser, but it *does* accept an image
// through the OS share sheet — `navigator.share({ files })` puts "Instagram →
// Stories" in the list. So the story path is: draw a card → share the PNG.
//
// Layout: cream page, Mndallan header and brand logo on top, the whole photo
// framed over a blurred copy of itself, and a red card (category drawings in
// the background) with a cream price sticker on its corner.

import { brandLogo, brandLogoIsName } from "@/lib/brands";
import { CATEGORY_CONFIG } from "@/lib/categories";

const W = 1080;
const H = 1920;

const INK = "#0b0c0f";
const INK_SOFT = "#61656e";
const PAPER = "#fefcf9";
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

// Round cream sticker with a scalloped edge and the price in red.
function drawSticker(ctx, { cx, cy, angle, amount, currency, family }) {
  const r = 160;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.shadowColor = "rgba(60, 0, 15, 0.45)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  ctx.beginPath();
  const n = 22;
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 ? r * 0.92 : r;
    const a = (Math.PI * i) / n;
    ctx.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  ctx.closePath();
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.setLineDash([6, 7]);
  ctx.strokeStyle = BRAND;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.direction = "ltr";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = BRAND;
  let size = 84;
  do { ctx.font = `900 ${size}px ${family}`; size -= 4; } while (ctx.measureText(amount).width > r * 1.6 && size > 40);
  ctx.fillText(amount, 0, 18);
  ctx.font = `800 36px ${family}`;
  ctx.fillText(currency, 0, 66);
  ctx.restore();
}

function drawStory(ctx, { title, price, img, city, store, code, site, rtl, logo, brand, brandImg, drawings, family }) {
  const edge = rtl ? W - 72 : 72;

  // Background: the site's cream at the top, deepening to a warm dark at the
  // bottom so the red card stands out.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, PAPER);
  bg.addColorStop(0.42, "#f1e6dc");
  bg.addColorStop(0.72, "#8c7470");
  bg.addColorStop(1, "#2a1f21");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Header: Mndallan on the reading side, the brand's logo on the other.
  if (logo) {
    const size = 104;
    const x = rtl ? W - 72 - size : 72;
    ctx.drawImage(logo, x, 64, size, size);
    ctx.save();
    ctx.direction = "ltr";
    ctx.textAlign = rtl ? "right" : "left";
    ctx.textBaseline = "alphabetic";
    const tx = rtl ? x - 22 : x + size + 22;
    ctx.fillStyle = BRAND;
    ctx.font = `800 52px ${family}`;
    ctx.fillText("Mndallan", tx, 118);
    ctx.fillStyle = INK_SOFT;
    ctx.font = `500 28px ${family}`;
    ctx.fillText("Baby Marketplace", tx, 156);
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
    const px = rtl ? 72 : W - 72 - pw;
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

  // Red card
  const cx = 48, cw = W - 96, ch = 470, cy = H - 56 - ch, cr = 64;
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
  drawings.forEach((d, i) => {
    const [x, y, a] = spots[i % spots.length];
    const tmp = document.createElement("canvas");
    tmp.width = tmp.height = 220;
    const t = tmp.getContext("2d");
    if (!t) return;
    drawContain(t, d, 0, 0, 220, 220);
    t.globalCompositeOperation = "source-in";
    t.fillStyle = "#ffffff";
    t.fillRect(0, 0, 220, 220);
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.translate(x + 110, y + 110);
    ctx.rotate(a);
    ctx.drawImage(tmp, -110, -110);
    ctx.restore();
  });
  ctx.restore();

  // Card content: chips, title, then the website and product code.
  const inner = cw - 120;
  drawChips(ctx, { city, store, family, rtl, edge: rtl ? cx + cw - 60 : cx + 60, top: cy + 58 });
  ctx.save();
  ctx.direction = rtl ? "rtl" : "ltr";
  ctx.textAlign = rtl ? "right" : "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  const t = wrapTitle(ctx, title ?? "", inner, family);
  ctx.font = `800 ${t.size}px ${family}`;
  t.lines.forEach((line, i) => ctx.fillText(line, rtl ? cx + cw - 60 : cx + 60, cy + 158 + t.size * 0.85 + i * t.size * 1.1));
  ctx.restore();

  const footY = cy + ch - 50;
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx + 60, footY - 66);
  ctx.lineTo(cx + cw - 60, footY - 66);
  ctx.stroke();
  ctx.direction = "ltr";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 46px ${family}`;
  ctx.textAlign = rtl ? "right" : "left";
  if (site) ctx.fillText(site, rtl ? cx + cw - 60 : cx + 60, footY);
  ctx.globalAlpha = 0.8;
  ctx.font = `700 34px ui-monospace, Menlo, monospace`;
  ctx.textAlign = rtl ? "left" : "right";
  if (code) ctx.fillText(code, rtl ? cx + 60 : cx + cw - 60, footY);
  ctx.restore();

  // Price sticker on the card's top corner (the end of the reading line).
  const [amount, ...rest] = String(price).split(" ");
  drawSticker(ctx, {
    cx: rtl ? cx + 190 : cx + cw - 190,
    cy: cy - 10,
    angle: rtl ? -0.17 : 0.17,
    amount,
    currency: rest.join(" ") || "IQD",
    family,
  });
}

/**
 * Draw the story card and return it as a PNG blob.
 *
 * @param {object} p
 * @param {string} p.title      product title
 * @param {string} p.price      pre-formatted price, e.g. "320,000 IQD"
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

  const drawingUrls = CATEGORY_CONFIG.filter((c) => c.value !== "all").slice(0, 4).map((c) => c.img);
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

// Makes a short Instagram reel (1080×1920 MP4, no sound) from 1–5 products,
// right in the browser: each frame is drawn on a canvas and encoded with
// WebCodecs (through mediabunny). Nothing is uploaded.
//
// Timeline: an intro with the products' photos fanned out and "this week's
// best", then each product laid out exactly like its Instagram story (photo
// slides in, the red price card rises), then the buyer reel's end card (logo,
// WhatsApp, web address, one short line). Sound is added in Instagram.

import { Output, Mp4OutputFormat, BufferTarget, CanvasSource, QUALITY_HIGH, canEncodeVideo } from "mediabunny";
import { brandLogo } from "@/lib/brands";
import { CATEGORY_CONFIG } from "@/lib/categories";
import {
  STORY_W as W, STORY_H as H, INK, INK_SOFT, BRAND, BRAND_LIGHT, BRAND_DARK, CARD_ART, STORY_FONT,
  loadImage, loadStoryFonts, roundedRect, smartCrop, drawCardArt, drawBackdrop, drawHeader, drawBrandPill, pickTheme,
} from "@/lib/storyImage";

export const REEL_MAX = 5;

const FPS = 30;
const INTRO = 57;
const PER = 57;
const OUTRO = 120;

// end card colours, as in the buyer reel
const RED = "#BE2340";
const PAPER = "#FDFCF9";
const GREEN = "#0B8F5A";
const PHONE = "+964 750 971 7177";
const SITE = "mndallan.com";

const clamp01 = (x) => Math.min(1, Math.max(0, x));
// linear map of f from [a, b] to [from, to], held at the ends
const lerp = (f, a, b, from = 0, to = 1, ease = (x) => x) => from + (to - from) * ease(clamp01((f - a) / (b - a)));
const easeIn = (x) => x * x * x;
const easeOut = (x) => 1 - (1 - x) ** 3;

// A spring from 0 to 1 started at frame 0 (the same physics as the reels
// made in Remotion: mass 1, the given damping and stiffness).
function spring(frame, { damping = 10, stiffness = 100 } = {}) {
  if (frame <= 0) return 0;
  const t = frame / FPS;
  const w = Math.sqrt(stiffness);
  const z = damping / (2 * w);
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w * t) * (1 + w * t);
}

// Photo cropped to fill a w×h box.
function cover(img, w, h) {
  const a = w / h, ia = img.width / img.height;
  return ia > a
    ? { sx: (img.width - img.height * a) / 2, sy: 0, sw: img.height * a, sh: img.height }
    : { sx: 0, sy: (img.height - img.width / a) / 2, sw: img.width, sh: img.width / a };
}

function redGradient(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, BRAND_LIGHT);
  g.addColorStop(0.5, BRAND);
  g.addColorStop(1, BRAND_DARK);
  return g;
}

// ---------- intro: the photos fanned out, then the headline ----------
function drawIntro(ctx, A, f) {
  ctx.drawImage(A.base, 0, 0);
  drawHeader(ctx, { logo: A.logo, family: A.family });
  const out = lerp(f, INTRO - 10, INTRO, 0, 1, easeIn);

  const n = A.items.length;
  A.items.forEach(({ img }, i) => {
    if (!img) return;
    const s = spring(f - 3 - i * 4, { damping: 13, stiffness: 140 });
    if (s <= 0.001) return;
    const k = i - (n - 1) / 2;
    const cw = 360, ch = 470;
    ctx.save();
    ctx.translate(W / 2 + k * 130 + out * (k >= 0 ? 1 : -1) * 900, 820 + Math.abs(k) * 40 + (1 - s) * 300);
    ctx.rotate(k * 0.13 * s);
    ctx.scale(s, s);
    ctx.shadowColor = "rgba(11,12,15,0.25)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
    roundedRect(ctx, -cw / 2, -ch / 2, cw, ch, 36);
    ctx.fillStyle = "#fff"; ctx.fill();
    ctx.shadowColor = "transparent";
    roundedRect(ctx, -cw / 2 + 12, -ch / 2 + 12, cw - 24, ch - 24, 26);
    ctx.clip();
    const c = cover(img, cw - 24, ch - 24);
    ctx.drawImage(img, c.sx, c.sy, c.sw, c.sh, -cw / 2 + 12, -ch / 2 + 12, cw - 24, ch - 24);
    ctx.restore();
  });

  const t = spring(f - 22, { damping: 12, stiffness: 160 });
  const t2 = spring(f - 28, { damping: 12, stiffness: 160 });
  ctx.save();
  ctx.globalAlpha = 1 - out;
  ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.save();
  ctx.translate(W / 2, 1360 + (1 - t) * 80);
  ctx.scale(t, t);
  ctx.fillStyle = INK; ctx.font = `900 112px ${A.family}`;
  ctx.fillText(A.text.headline, 0, 0);
  ctx.restore();
  ctx.save();
  ctx.translate(W / 2, 1530 + (1 - t2) * 80);
  ctx.scale(t2, t2);
  ctx.font = `900 104px ${A.family}`;
  const tw = ctx.measureText(A.text.headline2).width;
  ctx.shadowColor = "rgba(200,0,55,0.4)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
  roundedRect(ctx, -tw / 2 - 60, -88, tw + 120, 176, 88);
  ctx.fillStyle = redGradient(ctx, -tw / 2, -88, tw / 2, 88); ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#fff";
  ctx.fillText(A.text.headline2, 0, 8);
  ctx.restore();
  ctx.globalAlpha = (1 - out) * lerp(f, 34, 44);
  ctx.fillStyle = INK_SOFT; ctx.font = `700 46px ${A.family}`;
  ctx.fillText(A.text.sub, W / 2, 1700);
  ctx.restore();
}

// ---------- one product, laid out like its story ----------
function drawProduct(ctx, A, i, f) {
  const { story: p, img, brandImg, look, art, base } = A.items[i];
  const n = A.items.length;
  // the story's layout with the card art (see drawStory)
  const cx = 72, cw = W - 144;
  const CS = cw / CARD_ART.card[2];
  const ch = Math.round(CARD_ART.card[3] * CS);
  const cy = H - 140 - ch;

  const inP = spring(f, { damping: 15, stiffness: 120 });
  const inC = spring(f - 6, { damping: 11, stiffness: 150 });
  const outP = lerp(f, PER - 8, PER + 6, 0, 1, easeIn);
  const zoom = lerp(f, 0, PER + 6, 1, 1.07);

  let px = 72, py = 220, pw = W - 144, ph = cy - 36 - py;
  const sc = p.storyCrop && p.storyCrop.url === p.photo ? p.storyCrop : null;
  const crop = img && (sc
    ? { sx: sc.x * img.width, sy: sc.y * img.height, sw: sc.w * img.width, sh: sc.h * img.height }
    : smartCrop(img, (pw - 20) / (ph - 20)));
  if (crop) {
    const s = Math.min((pw - 20) / crop.sw, (ph - 20) / crop.sh);
    const fw = crop.sw * s + 20, fh = crop.sh * s + 20;
    px += (pw - fw) / 2; py += (ph - fh) / 2; pw = fw; ph = fh;
  }

  // photo frame: in from the left, out to the right, slowly zooming
  ctx.save();
  const mx = px + pw / 2, my = py + ph / 2;
  ctx.translate(mx + (1 - inP) * -W * 1.05 + outP * W * 1.05, my);
  ctx.rotate((1 - inP) * -0.12 + outP * 0.1);
  ctx.translate(-mx, -my);
  ctx.save();
  ctx.shadowColor = "rgba(11, 12, 15, 0.28)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 26;
  roundedRect(ctx, px, py, pw, ph, 56);
  ctx.fillStyle = "#ffffff"; ctx.fill();
  ctx.restore();
  roundedRect(ctx, px + 10, py + 10, pw - 20, ph - 20, 46);
  ctx.clip();
  if (crop) {
    const zw = crop.sw / zoom, zh = crop.sh / zoom;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, crop.sx + (crop.sw - zw) / 2, crop.sy + (crop.sh - zh) / 2, zw, zh, px + 10, py + 10, pw - 20, ph - 20);
  } else {
    ctx.fillStyle = "#f6eee5";
    ctx.fillRect(px, py, pw, ph);
  }
  ctx.restore();

  if (brandImg) {
    ctx.save();
    ctx.globalAlpha = lerp(f, 4, 12) * (1 - outP);
    drawBrandPill(ctx, { brand: p.brand, brandImg, family: A.family });
    ctx.restore();
  }

  // red card with the price tag, rising from below
  ctx.save();
  ctx.translate(0, (1 - inC) * 520 + outP * 700);
  drawCardArt(ctx, {
    art, CS, cx, cy, cw, ch, rtl: true, price: p.price, label: null,
    title: p.title, city: p.city, store: p.store, condition: p.condition, family: A.family, priceColor: look.price,
  });
  ctx.restore();

  // web address, "1 / 5" and the code, as in the story's footer
  ctx.save();
  ctx.globalAlpha = lerp(f, 6, 14) * (1 - outP);
  ctx.direction = "ltr"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK_SOFT; ctx.font = `700 32px ${A.family}`;
  ctx.textAlign = "right"; ctx.fillText(SITE, cx + cw - 24, H - 66);
  ctx.textAlign = "left"; if (p.code) ctx.fillText(p.code, cx + 24, H - 66);
  if (n > 1) {
    ctx.textAlign = "center"; ctx.fillStyle = BRAND; ctx.font = `800 32px ${A.family}`;
    ctx.fillText(`${i + 1} / ${n}`, W / 2, H - 66);
  }
  ctx.restore();
}

// ---------- end card, as in the buyer reel ----------
const BLOBS = [
  { color: "190, 35, 64", a: 0.16, size: 760, x: -160, y: 120, dx: 60, dy: 40, speed: 70 },
  { color: "91, 155, 222", a: 0.16, size: 680, x: 560, y: 820, dx: -50, dy: 60, speed: 85 },
  { color: "246, 190, 90", a: 0.18, size: 620, x: 520, y: -120, dx: -40, dy: 50, speed: 95 },
  { color: "190, 35, 64", a: 0.10, size: 560, x: -120, y: 1300, dx: 50, dy: -40, speed: 75 },
];
const DOTS = Array.from({ length: 16 }, (_, i) => ({
  x: ((i * 263) % 1040) + 20,
  y: (i * 397) % 1920,
  size: 10 + (i % 4) * 6,
  speed: 0.8 + (i % 5) * 0.35,
  color: ["#BE2340", "#5B9BDE", "#F2B84B", GREEN][i % 4],
}));
// Material "call" icon, 24×24
const PHONE_ICON = "M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z";

function drawEnd(ctx, A, f) {
  const pop = (d, stiffness = 170) => spring(f - d, { damping: 13, stiffness });
  const family = A.family;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  for (const b of BLOBS) {
    const x = b.x + Math.sin(f / b.speed) * b.dx + b.size / 2;
    const y = b.y + Math.cos(f / b.speed) * b.dy + b.size / 2;
    const g = ctx.createRadialGradient(x, y, 0, x, y, b.size / 2);
    g.addColorStop(0, `rgba(${b.color}, ${b.a})`);
    g.addColorStop(0.7, `rgba(${b.color}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - b.size / 2, y - b.size / 2, b.size, b.size);
  }
  ctx.save();
  ctx.globalAlpha = 0.35 * lerp(f, 0, 20);
  DOTS.forEach((d, i) => {
    const x = d.x + Math.sin((f + i * 20) / 18) * 14 + d.size / 2;
    const y = ((((d.y - f * d.speed * 3) % 1920) + 1920) % 1920) + d.size / 2;
    ctx.fillStyle = d.color;
    ctx.beginPath(); ctx.arc(x, y, d.size / 2, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();

  // logo in a white circle, with ripples going out from it
  const lx = 540, ly = 540 + Math.sin(f / 14) * 8;
  for (let r = 0; r < 3; r++) {
    if (f < 10 + r * 20) continue;
    const t = ((((f - 10 - r * 20) % 60) + 60) % 60) / 60;
    ctx.save();
    ctx.globalAlpha = (1 - t) * 0.35;
    ctx.strokeStyle = RED; ctx.lineWidth = 6 * (1 + t * 0.45);
    ctx.beginPath(); ctx.arc(lx, ly, (240 - 3) * (1 + t * 0.45), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  const logoIn = pop(0, 150);
  const s = logoIn * (1 + Math.sin(f / 20) * 0.02);
  if (s > 0.001) {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(((1 - logoIn) * -14 * Math.PI) / 180);
    ctx.scale(s, s);
    ctx.shadowColor = "rgba(190, 35, 64, 0.22)"; ctx.shadowBlur = 80; ctx.shadowOffsetY = 30;
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(0, 0, 240, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = "transparent";
    if (A.logo) ctx.drawImage(A.logo, -185 - 6, -185 + 6, 370, 370);
    ctx.restore();
  }

  // the name, letter by letter
  ctx.save();
  ctx.direction = "ltr"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.font = `800 150px ${family}`;
  ctx.fillStyle = RED;
  const word = "Mndallan";
  const widths = [...word].map((c) => ctx.measureText(c).width - 2);
  let x = W / 2 - widths.reduce((a, b) => a + b, 0) / 2;
  [...word].forEach((c, i) => {
    const k = pop(12 + i * 2, 220);
    ctx.save();
    ctx.globalAlpha = clamp01(k);
    ctx.translate(x + widths[i] / 2, 990 + (1 - k) * 60);
    ctx.scale(0.6 + k * 0.4, 0.6 + k * 0.4);
    ctx.fillText(c, -widths[i] / 2 - 1, 0);
    ctx.restore();
    x += widths[i];
  });
  ctx.restore();

  // WhatsApp button, with a pulse behind it and a shine passing over it
  const rise = (d) => ({ a: lerp(f, d, d + 10), dy: lerp(f, d, d + 14, 40, 0, easeOut) });
  const wb = rise(30);
  if (wb.a > 0) {
    ctx.save();
    ctx.globalAlpha = wb.a;
    ctx.font = `700 46px ${family}`;
    const label = `WhatsApp ${PHONE}`;
    const bw = 46 + 18 + ctx.measureText(label).width + 92, bh = 98;
    const bx = W / 2 - bw / 2, by = 1065 + wb.dy;
    const pt = (f % 40) / 40;
    ctx.save();
    ctx.globalAlpha = wb.a * 0.3 * (1 - pt);
    ctx.translate(W / 2, by + bh / 2);
    ctx.scale(1 + pt * 0.12, 1 + pt * 0.35);
    roundedRect(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2);
    ctx.fillStyle = GREEN; ctx.fill();
    ctx.restore();
    ctx.save();
    const bs = 1 + Math.sin(f / 10) * 0.015;
    ctx.translate(W / 2, by + bh / 2); ctx.scale(bs, bs); ctx.translate(-W / 2, -(by + bh / 2));
    ctx.shadowColor = "rgba(11, 143, 90, 0.35)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
    roundedRect(ctx, bx, by, bw, bh, bh / 2);
    const g = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    g.addColorStop(0, "#12B36F"); g.addColorStop(1, GREEN);
    ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = "transparent";
    roundedRect(ctx, bx, by, bw, bh, bh / 2);
    ctx.clip();
    const shine = lerp((f - 40) % 75, 0, 30, -200, 900);
    const sg = ctx.createLinearGradient(bx + shine, 0, bx + shine + 120, 0);
    sg.addColorStop(0, "rgba(255,255,255,0)"); sg.addColorStop(0.5, "rgba(255,255,255,0.45)"); sg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sg; ctx.fillRect(bx + shine, by, 120, bh);
    ctx.fillStyle = "#fff";
    ctx.save();
    ctx.translate(bx + 46, by + (bh - 46) / 2);
    ctx.scale(46 / 24, 46 / 24);
    ctx.fill(new Path2D(PHONE_ICON));
    ctx.restore();
    ctx.direction = "ltr"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(label, bx + 46 + 46 + 18, by + bh / 2 + 2);
    ctx.restore();
    ctx.restore();
  }

  // the address types itself out, then gets underlined
  ctx.save();
  ctx.direction = "ltr"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.font = `700 70px ${family}`;
  const uw = ctx.measureText(SITE).width;
  const ux = W / 2 - uw / 2, uy = 1300;
  const typed = Math.floor(lerp(f, 44, 70, 0, SITE.length));
  ctx.fillStyle = "#111";
  ctx.fillText(SITE.slice(0, typed), ux, uy);
  const caret = (typed > 0 && typed < SITE.length) || (f >= 44 && f < 100 && Math.floor(f / 12) % 2 === 0);
  if (caret) { ctx.fillStyle = RED; ctx.fillText("|", ux + ctx.measureText(SITE.slice(0, typed)).width + 6, uy); }
  const ul = lerp(f, 70, 84, 0, 1, easeOut);
  if (ul > 0) { roundedRect(ctx, ux, uy + 18, uw * ul, 8, 4); ctx.fillStyle = RED; ctx.fill(); }
  ctx.restore();

  // the short line on a card, word by word
  const cb = rise(78);
  if (cb.a > 0) {
    ctx.save();
    ctx.globalAlpha = cb.a;
    const cx = 70, cy = 1385 + cb.dy, cw = 940, chh = 150;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.08)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 20;
    roundedRect(ctx, cx, cy, cw, chh, 40);
    ctx.fillStyle = "rgba(255,255,255,0.82)"; ctx.fill();
    ctx.restore();
    ctx.save();
    roundedRect(ctx, cx, cy, cw, chh, 40); ctx.clip();
    ctx.fillStyle = RED; ctx.fillRect(cx, cy, cw, 8);
    ctx.restore();
    ctx.font = `700 48px ${family}`;
    ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    const words = A.text.endLine.split(" ");
    const space = 14;
    const ws = words.map((w) => ctx.measureText(w).width);
    let right = W / 2 + (ws.reduce((a, b) => a + b, 0) + space * (words.length - 1)) / 2;
    words.forEach((w, i) => {
      const d = 86 + i * 2.5;
      ctx.save();
      ctx.globalAlpha = cb.a * lerp(f, d, d + 8);
      ctx.fillStyle = "#111";
      ctx.fillText(w, right, cy + chh / 2 + 6 + lerp(f, d, d + 10, 18, 0));
      ctx.restore();
      right -= ws[i] + space;
    });
    ctx.restore();
  }
}

function drawFrame(ctx, A, frame) {
  const n = A.items.length;
  const end = INTRO + n * PER;
  if (frame >= end) return drawEnd(ctx, A, frame - end);
  if (frame < INTRO) {
    drawIntro(ctx, A, frame);
    if (frame >= INTRO - 6) drawProduct(ctx, A, 0, frame - INTRO);
    // (the first product is red, on the intro's white page)
    return;
  }
  const i = Math.floor((frame - INTRO) / PER);
  const f = frame - INTRO - i * PER;
  // each product on its own colour's page; the new colour sweeps in from the left
  const prev = i > 0 && f < 10 ? A.items[i - 1].base : null;
  if (prev) {
    ctx.drawImage(prev, 0, 0);
    const wipe = W * easeOut(clamp01(f / 10));
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, wipe, H); ctx.clip();
    ctx.drawImage(A.items[i].base, 0, 0);
    ctx.restore();
  } else ctx.drawImage(A.items[i].base, 0, 0);
  drawHeader(ctx, { logo: A.logo, family: A.family });
  if (i > 0 && f < 6) drawProduct(ctx, A, i - 1, f + PER);
  drawProduct(ctx, A, i, f);
}

/** Whether this browser can make a reel (it needs WebCodecs H.264 encoding). */
export async function canMakeReel() {
  try {
    return typeof VideoEncoder !== "undefined" && (await canEncodeVideo("avc", { width: W, height: H, bitrate: 8e6 }));
  } catch {
    return false;
  }
}

// Load everything a reel needs and lay out its drawing state.
async function prepare(stories, text) {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* non-blocking */ }
  }
  const drawingUrls = CATEGORY_CONFIG.filter((c) => c.value !== "all").map((c) => c.img);
  const [logo, art, fontsOk, ...drawings] = await Promise.all([
    loadImage("/logo-mndallan.svg"),
    loadImage(CARD_ART.src),
    loadStoryFonts(),
    ...drawingUrls.map((u) => loadImage(u, { cors: true })),
  ]);
  if (!art) throw new Error("Could not load the card art");
  const inks = drawings.filter(Boolean);
  // one page per colour theme, drawn once
  const pages = new Map();
  const page = (tint) => {
    if (!pages.has(tint)) {
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      drawBackdrop(c.getContext("2d"), inks, tint);
      pages.set(tint, c);
    }
    return pages.get(tint);
  };
  // each product in the next colour, as in the stories
  const items = await Promise.all(stories.slice(0, REEL_MAX).map(async (story, i) => {
    const look = pickTheme(i);
    return {
      story, look, base: page(look.tint),
      art: (await loadImage(look.art)) ?? art,
      img: await loadImage(story.photo, { cors: true }),
      brandImg: await loadImage(brandLogo(story.brand)),
    };
  }));
  const pageFont = getComputedStyle(document.body).fontFamily || "sans-serif";
  const family = fontsOk ? `"${STORY_FONT}", ${pageFont}` : pageFont;

  const base = page(null);

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  return { canvas, ctx: canvas.getContext("2d"), A: { logo, art, base, items, family, text } };
}

/**
 * The reel's cover: the intro with every photo fanned out and the headline
 * in, as a PNG. Its photos and headline sit inside the middle 4:5 that the
 * profile grid shows.
 */
export async function buildReelCover(stories, text) {
  const { canvas, ctx, A } = await prepare(stories, text);
  drawIntro(ctx, A, INTRO - 12);
  return new Promise((resolve, reject) => {
    try { canvas.toBlob(resolve, "image/png"); } catch (err) { reject(err); }
  });
}

/**
 * Make the reel and return it as an MP4 blob.
 *
 * @param {object[]} stories  1–5 products, each as for buildStoryImage (title,
 *                            price, photo, storyCrop, city, store, condition, code, brand)
 * @param {object} text       Kurdish lines: { headline, headline2, sub, endLine }
 * @param {(done: number) => void} [onProgress]  0..1
 */
export async function buildReelVideo(stories, text, onProgress) {
  const { canvas, ctx, A } = await prepare(stories, text);
  const { items } = A;

  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
  const source = new CanvasSource(canvas, { codec: "avc", bitrate: QUALITY_HIGH, keyFrameInterval: 2 });
  output.addVideoTrack(source, { frameRate: FPS });
  await output.start();
  const total = INTRO + items.length * PER + OUTRO;
  for (let frame = 0; frame < total; frame++) {
    ctx.clearRect(0, 0, W, H);
    drawFrame(ctx, A, frame);
    await source.add(frame / FPS, 1 / FPS);
    if (frame % 10 === 0) onProgress?.(frame / total);
  }
  await output.finalize();
  onProgress?.(1);
  return new Blob([output.target.buffer], { type: "video/mp4" });
}

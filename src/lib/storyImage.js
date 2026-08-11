// Renders a product as a 1080×1920 Instagram-Story card on a canvas.
//
// Instagram accepts no URL from the browser, but it *does* accept an image
// through the OS share sheet — `navigator.share({ files })` puts "Instagram →
// Stories" in the list. So the story path is: draw a card → share the PNG.

const W = 1080;
const H = 1920;

const INK = "#0b0c0f";
const INK_SOFT = "#61656e";
const PAPER = "#fefcf9";
const BRAND = "#ed0040";

// The photo lives on R2. `crossOrigin` is required or the canvas is tainted and
// toBlob() throws — and if the bucket sends no ACAO header the load simply
// fails, which we treat as "no photo" rather than letting it poison the canvas.
function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      console.log("⚠ No image source provided");
      return resolve(null);
    }
    const img = new Image();
    // Don't set crossOrigin — R2 URLs from the same domain don't need it
    // and the strict CORS requirement breaks the load despite the URL working

    img.onload = () => {
      console.log("✓ Story image loaded successfully:", {
        src,
        width: img.width,
        height: img.height,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });
      resolve(img);
    };

    img.onerror = (event) => {
      console.error("✗ Story image failed to load:", {
        src,
        errorEvent: event
      });
      resolve(null);
    };

    img.onabort = () => {
      console.warn("⚠ Story image load aborted:", src);
      resolve(null);
    };

    console.log("📷 Starting to load story image:", src);
    img.src = src;
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
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function fitText(ctx, text, maxWidth, startSize, family, weight = "700") {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  } while (size > 28);
  return size;
}

/**
 * Draw the story card and return it as a PNG blob.
 *
 * @param {object} p
 * @param {string} p.title      product title
 * @param {string} p.price      pre-formatted price, e.g. "320,000 IQD"
 * @param {string} [p.photo]    absolute image URL (R2)
 * @param {string} [p.meta]     small line under the title (city · category)
 * @param {string} [p.code]     product code, e.g. "26-0009"
 * @param {string} [p.site]     domain shown in the footer
 * @param {boolean} [p.rtl]     right-to-left layout for ckb/ar
 */
export async function buildStoryImage({ title, price, photo, meta, code, site, rtl = false }) {
  // Webfonts must be resolved before fillText or the card renders in a
  // fallback face (and Kurdish/Arabic glyphs may not render at all).
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* non-blocking */ }
  }

  const img = await loadImage(photo);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const family = getComputedStyle(document.body).fontFamily || "sans-serif";
  const align = rtl ? "right" : "left";
  const edge = rtl ? W - 90 : 90;
  ctx.direction = rtl ? "rtl" : "ltr";

  // Backdrop
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  // Photo panel — a tall rounded card, or a brand-tinted placeholder.
  const panelY = 240;
  const panelH = 1080;
  ctx.save();
  roundedRect(ctx, 90, panelY, W - 180, panelH, 48);
  ctx.clip();
  if (img) {
    drawCover(ctx, img, 90, panelY, W - 180, panelH);
  } else {
    ctx.fillStyle = "#f6eee5";
    ctx.fillRect(90, panelY, W - 180, panelH);
  }
  ctx.restore();

  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";

  // Header — brand wordmark
  ctx.fillStyle = BRAND;
  ctx.font = `800 46px ${family}`;
  ctx.fillText("Dasty2 Mndalan", edge, 160);

  // Title
  ctx.fillStyle = INK;
  const titleSize = fitText(ctx, title, W - 180, 76, family, "800");
  ctx.font = `800 ${titleSize}px ${family}`;
  ctx.fillText(title, edge, panelY + panelH + 130);

  // Meta line (city · category)
  if (meta) {
    ctx.fillStyle = INK_SOFT;
    ctx.font = `500 40px ${family}`;
    ctx.fillText(meta, edge, panelY + panelH + 195);
  }

  // Price
  ctx.fillStyle = BRAND;
  const priceSize = fitText(ctx, price, W - 180, 96, family, "800");
  ctx.font = `800 ${priceSize}px ${family}`;
  ctx.fillText(price, edge, panelY + panelH + 305);

  // Footer — product code and domain, on opposite edges
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 34px ${family}`;
  if (code) ctx.fillText(code, edge, H - 110);
  if (site) {
    ctx.textAlign = rtl ? "left" : "right";
    ctx.fillText(site, rtl ? 90 : W - 90, H - 110);
  }

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.92));
}

/**
 * Build the card and hand it to the OS share sheet, where Instagram offers
 * "Stories". Falls back to downloading the PNG when the runtime cannot share
 * files (desktop Safari, Firefox, older Android WebViews).
 *
 * @returns {Promise<"shared" | "downloaded" | "failed">}
 */
export async function shareStoryImage(product) {
  console.log("📤 Starting share story image with product:", product);
  let blob;
  try {
    blob = await buildStoryImage(product);
  } catch (err) {
    console.error("❌ buildStoryImage threw error:", err);
    return "failed";
  }
  if (!blob) {
    console.error("❌ No blob generated");
    return "failed";
  }
  console.log("✓ Blob created successfully, size:", blob.size, "bytes");

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

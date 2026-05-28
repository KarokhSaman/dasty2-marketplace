import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { R2 } from "@convex-dev/r2";

const r2 = new R2(components.r2);

const PUBLIC_BASE = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
const CLOUDINARY_HOST = "res.cloudinary.com";

function isCloudinary(url: string) {
  return url.includes(CLOUDINARY_HOST);
}

async function copyToR2(
  ctx: ActionCtx,
  url: string,
  key?: string,
): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  const blob = await res.blob();
  const storedKey = await r2.store(ctx, blob, {
    key,
    type: blob.type || "image/jpeg",
    cacheControl: "public, max-age=31536000, immutable",
  });
  return `${PUBLIC_BASE}/${storedKey}`;
}

export const listProductsPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const page = await ctx.db.query("products").paginate(paginationOpts);
    return {
      ...page,
      page: page.page.map((p) => ({ _id: p._id, photos: p.photos })),
    };
  },
});

export const setProductPhotos = internalMutation({
  args: { id: v.id("products"), photos: v.array(v.string()) },
  handler: async (ctx, { id, photos }) => {
    await ctx.db.patch(id, { photos });
  },
});

// Copies every Cloudinary product photo into R2 and rewrites products.photos to
// the R2 public URL. Idempotent: non-Cloudinary URLs are left untouched.
export const migrateProductPhotos = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!PUBLIC_BASE) throw new Error("R2_PUBLIC_URL env var is not set in Convex");

    let cursor: string | null = null;
    let migratedProducts = 0;
    let migratedPhotos = 0;
    let scanned = 0;

    for (;;) {
      const page = await ctx.runQuery(internal.migrateImages.listProductsPage, {
        paginationOpts: { numItems: 25, cursor },
      });

      for (const product of page.page) {
        scanned++;
        let changed = false;
        const next: string[] = [];
        for (const url of product.photos) {
          if (isCloudinary(url)) {
            next.push(await copyToR2(ctx, url));
            migratedPhotos++;
            changed = true;
          } else {
            next.push(url);
          }
        }
        if (changed) {
          await ctx.runMutation(internal.migrateImages.setProductPhotos, {
            id: product._id,
            photos: next,
          });
          migratedProducts++;
        }
      }

      if (page.isDone) break;
      cursor = page.continueCursor;
    }

    return { scanned, migratedProducts, migratedPhotos };
  },
});

// Category icons are hardcoded Cloudinary URLs in lib/categories.js and
// convex/seed.ts. This uploads them to R2 under stable keys and returns the new
// public URLs so the source files can be updated.
const CATEGORY_ICONS: Record<string, string> = {
  "categories/all.png": "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138342/all_xeokol.png",
  "categories/strollers.png": "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138359/strollers_mr5mhk.png",
  "categories/carseats.png": "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138358/carseats_lpxcga.png",
  "categories/carry-cot.png": "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138358/Carry_Cot_y7yace.png",
  "categories/bed.png": "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138358/Bed_ouycjy.png",
  "categories/feeding.png": "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138359/feeding_aoipl9.png",
  "categories/bouncers.png": "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779141106/bouncers_wrha1c.png",
  "categories/highchairs.png": "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138342/highchairs_erlg5h.png",
  "categories/toys.png": "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138359/toys_dziew5.png",
  "categories/electronics.png": "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138359/electronics_qqj0mi.png",
  "categories/other.png": "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779141105/Other_jq5gok.png",
};

export const migrateCategoryIcons = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!PUBLIC_BASE) throw new Error("R2_PUBLIC_URL env var is not set in Convex");

    const mapping: Record<string, string> = {};
    for (const [key, url] of Object.entries(CATEGORY_ICONS)) {
      mapping[url] = await copyToR2(ctx, url, key);
    }
    return mapping;
  },
});

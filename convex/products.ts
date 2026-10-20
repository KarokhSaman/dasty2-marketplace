import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  categoryValidator,
  conditionValidator,
  productStatusValidator,
} from "./types";
import {
  getCurrentUser,
  isAdminUser,
  requireAdmin,
  requireCurrentSeller,
} from "./auth";
import { resolveProfit } from "./fees";
import { r2 } from "./r2";
import { issueSeq } from "./seq";
import { priceInfo, todayBaghdad, type StoreDiscount } from "./discount";

type PublicProduct = Omit<Doc<"products">, "sellerId" | "sellerPhone" | "profit" | "soldFromId" | "deleteRequestedAt" | "deleteRequestReason" | "deleteRequestFrom">;

const publicProductValidator = v.object({
  _id: v.id("products"),
  _creationTime: v.number(),
  seq: v.string(),
  title: v.string(),
  description: v.string(),
  category: v.string(),
  brand: v.optional(v.string()),
  condition: conditionValidator,
  price: v.number(),
  photos: v.array(v.string()),
  mainPhotoIndex: v.optional(v.number()),
  status: productStatusValidator,
  city: v.string(),
  sellerName: v.string(),
  featured: v.optional(v.boolean()),
  featuredUntil: v.optional(v.string()),
  featuredAt: v.optional(v.string()),
  featuredPosition: v.optional(v.number()),
  pinned: v.optional(v.boolean()),
  pinnedUntil: v.optional(v.string()),
  pinnedAt: v.optional(v.string()),
  views: v.optional(v.number()),
  notes: v.optional(v.string()),
  approvedBy: v.optional(v.string()),
  approvedAt: v.optional(v.string()),
  dateAdded: v.string(),
  dateSold: v.optional(v.string()),
  stock: v.optional(v.number()),
  storeId: v.optional(v.id("stores")),
  salePrice: v.optional(v.number()),
  storeDiscount: v.optional(v.object({ percent: v.number(), start: v.string(), end: v.string() })),
});

const toPublic = ({
  sellerId: _sellerId,
  sellerPhone: _sellerPhone,
  profit: _profit,
  soldFromId: _soldFromId,
  deleteRequestedAt: _deleteRequestedAt,
  deleteRequestReason: _deleteRequestReason,
  deleteRequestFrom: _deleteRequestFrom,
  ...rest
}: Doc<"products">): PublicProduct => rest;

function validateListingInput({
  title,
  price,
  photos,
}: {
  title: string;
  price: number;
  photos: string[];
}) {
  if (!title.trim()) throw new Error("Product title is required");
  if (!Number.isInteger(price) || price < 5_000) {
    throw new Error("Product price must be at least 5,000 IQD");
  }
  if (
    photos.length < 2 ||
    photos.length > 5 ||
    photos.some((photo) => !photo.trim())
  ) {
    throw new Error("A product must have between 2 and 5 photos");
  }
}

// Resolves the optional store/stock on a listing. A seller may list under any
// store they manage, under the store they own (the account linked to it), or —
// unless they only own a store and manage none, which locks them to it — under
// no store at all.
async function resolveStoreListing(
  ctx: QueryCtx,
  seller: Doc<"users">,
  storeId: Id<"stores"> | undefined,
  stock: number | undefined,
): Promise<{ store: Doc<"stores"> | null; storeId: Id<"stores"> | undefined }> {
  const linked = await ctx.db
    .query("stores")
    .withIndex("by_linked_user", (q) => q.eq("linkedUserId", seller._id))
    .first();
  const managesStores =
    (await ctx.db
      .query("stores")
      .withIndex("by_seller", (q) => q.eq("sellerId", seller._id.toString()))
      .first()) !== null;

  let store: Doc<"stores"> | null = null;
  if (linked && !managesStores) {
    store = linked;
  } else if (storeId) {
    store = await ctx.db.get(storeId);
    const allowed = store && (store.sellerId === seller._id.toString() || store._id === linked?._id);
    if (!store || !allowed) throw new ConvexError("Store not found");
  }

  if (!store) {
    if (stock !== undefined) throw new ConvexError("Stock requires a store");
    return { store: null, storeId: undefined };
  }
  if (stock !== undefined && (!Number.isInteger(stock) || stock < 1 || stock > 9999)) {
    throw new ConvexError("Stock must be a whole number between 1 and 9999");
  }
  return { store, storeId: store._id };
}

async function loadStoreDiscounts(ctx: QueryCtx): Promise<Map<string, StoreDiscount>> {
  const today = todayBaghdad();
  const map = new Map<string, StoreDiscount>();
  for (const store of await ctx.db.query("stores").collect()) {
    if (store.discountPercent && store.discountStart && store.discountEnd && store.discountEnd >= today) {
      map.set(store._id, { percent: store.discountPercent, start: store.discountStart, end: store.discountEnd });
    }
  }
  return map;
}

// Adds `storeDiscount` to products of discounted stores. Clients work out the
// price for the current day from it (a cached query result can't notice that a
// discount started or ended at midnight).
async function withStoreDiscounts<T extends { storeId?: Id<"stores"> }>(
  ctx: QueryCtx,
  products: T[],
): Promise<(T & { storeDiscount?: StoreDiscount })[]> {
  const discounts = await loadStoreDiscounts(ctx);
  if (discounts.size === 0) return products;
  return products.map((p) => {
    const d = p.storeId ? discounts.get(p.storeId) : undefined;
    return d ? { ...p, storeDiscount: d } : p;
  });
}

// Price actually paid and the fee on it, when a store discount applies. An
// explicit price (set by the admin) wins; otherwise a running discount sets it.
// The fee is worked out on that price: flat fees stay the same, percentage and
// the price table change.
async function saleTerms(
  ctx: MutationCtx,
  product: Doc<"products">,
  explicit?: number,
): Promise<{ salePrice?: number; profit?: number }> {
  if (explicit === undefined && product.salePrice !== undefined) return {};
  let salePrice = explicit;
  const store = product.storeId ? await ctx.db.get(product.storeId) : null;
  if (salePrice === undefined && store?.discountPercent && store.discountStart && store.discountEnd) {
    const info = priceInfo({
      price: product.price,
      storeDiscount: { percent: store.discountPercent, start: store.discountStart, end: store.discountEnd },
    });
    if (info.original !== null) salePrice = info.price;
  }
  if (salePrice === undefined || salePrice === product.price) return {};
  if (!Number.isInteger(salePrice) || salePrice <= 0) throw new Error("Sale price must be a whole number of IQD");

  const sellerId = ctx.db.normalizeId("users", product.sellerId);
  const seller = sellerId ? await ctx.db.get(sellerId) : null;
  const today = todayBaghdad();
  const offers = await ctx.db.query("offers").filter((q) => q.eq(q.field("isActive"), true)).collect();
  const activeOffer = offers.find((o) => o.startDate <= today && o.endDate >= today) ?? null;
  return { salePrice, profit: resolveProfit(salePrice, store ?? seller, activeOffer) };
}

// Undo saleTerms when a sale is reversed: back to the listed price and its fee.
async function listingTerms(ctx: MutationCtx, product: Doc<"products">): Promise<{ salePrice: undefined; profit?: number }> {
  const store = product.storeId ? await ctx.db.get(product.storeId) : null;
  const sellerId = ctx.db.normalizeId("users", product.sellerId);
  const seller = sellerId ? await ctx.db.get(sellerId) : null;
  const today = todayBaghdad();
  const offers = await ctx.db.query("offers").filter((q) => q.eq(q.field("isActive"), true)).collect();
  const activeOffer = offers.find((o) => o.startDate <= today && o.endDate >= today) ?? null;
  return { salePrice: undefined, profit: resolveProfit(product.price, store ?? seller, activeOffer) };
}

async function getInactiveSellerIds(ctx: QueryCtx): Promise<Set<string>> {
  const inactive = await ctx.db
    .query("users")
    .withIndex("by_role_and_isActive", (q) =>
      q.eq("role", "seller").eq("isActive", false),
    )
    .collect();
  return new Set(inactive.map((s) => s._id.toString()));
}

// Uploaded photos are stored in R2 under a UUID name at the bucket root, and the
// product keeps the public URL (https://<assets host>/<uuid>). Category icons and
// seed images use other names, so only UUID keys on our own asset hosts count.
// (R2_PUBLIC_URL in the Convex env is stale — it still names the old domain — so
// the allowed hosts are listed here, plus whatever that variable says.)
const UPLOADED_PHOTO_PATH = /^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

function uploadedPhotoKey(photoUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(photoUrl);
  } catch {
    return null;
  }
  const envHost = process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).hostname : null;
  const ownHost =
    url.hostname === envHost ||
    url.hostname.endsWith("mndallan.com") ||
    url.hostname.endsWith("dasty2mndalan.com");
  if (!ownHost) return null;
  return UPLOADED_PHOTO_PATH.exec(url.pathname)?.[1] ?? null;
}

// Removes the product's photo files from R2 — but only files no other product
// uses (reposts and sold-unit entries share the original's photo URLs, possibly
// under another host name, so files are compared by key). Best effort: a storage
// hiccup must never block deleting the product itself.
async function deleteUnusedR2Photos(ctx: MutationCtx, product: Doc<"products">) {
  const keys = new Set<string>();
  for (const url of product.photos) {
    const key = uploadedPhotoKey(url);
    if (key) keys.add(key);
  }
  if (keys.size === 0) return;

  const others = await ctx.db.query("products").collect();
  for (const p of others) {
    if (p._id === product._id) continue;
    for (const url of p.photos) {
      const key = uploadedPhotoKey(url);
      if (key) keys.delete(key);
    }
  }
  for (const key of keys) {
    try {
      await r2.deleteObject(ctx, key);
    } catch (err) {
      console.error(`Could not delete R2 photo ${key}`, err);
    }
  }
}

async function deleteProductData(ctx: MutationCtx, product: Doc<"products">) {
  const notifications = await ctx.db
    .query("notifications")
    .withIndex("by_productId", (q) =>
      q.eq("productId", product._id as string),
    )
    .collect();
  for (const notification of notifications) {
    await ctx.db.delete(notification._id);
  }

  // Development mock uploads use Convex storage rather than R2. Remove those
  // objects when their product is deleted; R2 URLs are left to the R2 lifecycle.
  const convexCloudUrl = process.env.CONVEX_CLOUD_URL;
  if (convexCloudUrl) {
    const storageOrigin = new URL(convexCloudUrl).origin;
    for (const photo of product.photos) {
      try {
        const url = new URL(photo);
        const match = url.pathname.match(/^\/api\/storage\/([^/]+)$/);
        if (url.origin === storageOrigin && match) {
          await ctx.storage.delete(match[1] as Id<"_storage">);
        }
      } catch {
        // Invalid/external image URLs have no Convex storage object to remove.
      }
    }
  }

  await deleteUnusedR2Photos(ctx, product);
  await ctx.db.delete(product._id);
}

export const getPublicById = query({
  args: { id: v.string() },
  returns: v.union(v.null(), publicProductValidator),
  handler: async (ctx, { id }) => {
    const productId = ctx.db.normalizeId("products", id);
    if (!productId) return null;
    const product = await ctx.db.get(productId);
    if (!product || product.status !== "approved") return null;
    const inactiveIds = await getInactiveSellerIds(ctx);
    if (inactiveIds.has(product.sellerId)) return null;
    // Store names are never shown to buyers, only whether it is a store product.
    const [withDiscount] = await withStoreDiscounts(ctx, [toPublic(product)]);
    return withDiscount;
  },
});

export const getPublic = query({
  args: {},
  handler: async (ctx) => {
    const inactiveIds = await getInactiveSellerIds(ctx);
    const products = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
    return await withStoreDiscounts(
      ctx,
      products.filter((p) => !inactiveIds.has(p.sellerId)).map(toPublic),
    );
  },
});

// Cities that currently have at least one live product — feeds the buyer home
// page City filter (the page only loads products a screenful at a time, so it
// can't work this out itself). Hops from city to city through the index, so it
// reads a few documents per city rather than every product.
export const listCities = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const inactiveIds = await getInactiveSellerIds(ctx);
    const cities: string[] = [];
    let last = "";
    for (let i = 0; i < 200; i++) {
      const next = await ctx.db
        .query("products")
        .withIndex("by_status_city", (q) => q.eq("status", "approved").gt("city", last))
        .first();
      if (!next) break;
      const city = next.city;
      last = city;
      for await (const p of ctx.db
        .query("products")
        .withIndex("by_status_city", (q) => q.eq("status", "approved").eq("city", city))) {
        if (!inactiveIds.has(p.sellerId)) {
          cities.push(city);
          break;
        }
      }
    }
    return cities;
  },
});

// "Similar products" strip on the product page: only same-category approved
// products, capped, instead of the whole catalogue. The client shuffles and
// shows 10.
export const getRelated = query({
  args: { category: v.string(), excludeId: v.optional(v.string()) },
  handler: async (ctx, { category, excludeId }) => {
    const inactiveIds = await getInactiveSellerIds(ctx);
    const products = await ctx.db
      .query("products")
      .withIndex("by_status_category", (q) =>
        q.eq("status", "approved").eq("category", category),
      )
      .order("desc")
      .take(60);
    return await withStoreDiscounts(
      ctx,
      products.filter((p) => p._id !== excludeId && !inactiveIds.has(p.sellerId)).map(toPublic),
    );
  },
});

// Returns featured products sorted by position (1-10) with rotation for same-position products
export const getFeatured = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    const inactiveIds = await getInactiveSellerIds(ctx);
    const all = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    const featured = all.filter(
      (p) =>
        !inactiveIds.has(p.sellerId) &&
        p.featured &&
        (!p.featuredUntil || p.featuredUntil >= today),
    );

    // Split into positioned and unpositioned products
    const positioned = featured.filter((p) => p.featuredPosition !== undefined);
    const unpositioned = featured.filter((p) => p.featuredPosition === undefined);

    // Sort positioned by position (1-10), apply rotation within each position
    const sortedPositioned = [];
    for (let pos = 1; pos <= 10; pos++) {
      const productsAtPosition = positioned
        .filter((p) => p.featuredPosition === pos)
        .sort((a, b) => a._id.localeCompare(b._id)); // Deterministic stable sort by ID

      if (productsAtPosition.length > 0) {
        // Calculate rotation offset based on current time (rotate every 10 seconds)
        const rotationOffset = Math.floor(Date.now() / 10000) % productsAtPosition.length;
        // Rotate array by offset
        const rotated = [
          ...productsAtPosition.slice(rotationOffset),
          ...productsAtPosition.slice(0, rotationOffset),
        ];
        sortedPositioned.push(...rotated);
      }
    }

    // Sort unpositioned by featuredAt descending (newest first)
    const sortedUnpositioned = unpositioned.sort((a, b) => {
      const aTime = a.featuredAt ? new Date(a.featuredAt).getTime() : 0;
      const bTime = b.featuredAt ? new Date(b.featuredAt).getTime() : 0;
      return bTime - aTime;
    });

    // Return positioned first, then unpositioned
    return await withStoreDiscounts(ctx, [...sortedPositioned, ...sortedUnpositioned].map(toPublic));
  },
});

// Paginated version — used by the buyer listing page
export const getPublicPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    category: v.optional(v.string()),
  },
  handler: async (ctx, { paginationOpts, category }) => {
    const inactiveIds = await getInactiveSellerIds(ctx);
    const q =
      category && category !== "all"
        ? ctx.db
            .query("products")
            .withIndex("by_status_category", (q) =>
              q.eq("status", "approved").eq("category", category),
            )
        : ctx.db
            .query("products")
            .withIndex("by_status", (q) => q.eq("status", "approved"));

    const result = await q.order("desc").paginate(paginationOpts);
    return {
      ...result,
      page: await withStoreDiscounts(
        ctx,
        result.page.filter((p) => !inactiveIds.has(p.sellerId)).map(toPublic),
      ),
    };
  },
});

// A seller's dashboard list: their own products, plus — for a store-owner
// account — every product of the linked store posted by the managing seller
// (read-only, with the manager's identity and phone stripped).
export const getBySeller = query({
  args: {},
  handler: async (ctx) => {
    const seller = await requireCurrentSeller(ctx);
    const me = seller._id.toString();
    const own = await ctx.db
      .query("products")
      .withIndex("by_seller", q => q.eq("sellerId", me))
      .collect();
    const linked = await ctx.db
      .query("stores")
      .withIndex("by_linked_user", (q) => q.eq("linkedUserId", seller._id))
      .first();
    if (!linked) return own;
    const storeProducts = await ctx.db
      .query("products")
      .withIndex("by_store", q => q.eq("storeId", linked._id))
      .collect();
    const ownIds = new Set(own.map(p => p._id));
    const managed = storeProducts
      .filter(p => !ownIds.has(p._id))
      .map(({ sellerId: _sid, sellerPhone: _sp, sellerName: _sn, ...rest }) => ({
        ...rest,
        postedByManager: true as const,
      }));
    return [...own, ...managed].sort((a, b) => a._creationTime - b._creationTime);
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const products = await ctx.db.query("products").collect();
    const sellers  = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "seller"))
      .collect();
    const addrMap  = new Map(sellers.map(s => [s._id.toString(), s.address ?? ""]));
    const stores   = await ctx.db.query("stores").collect();
    const storeMap = new Map(stores.map(st => [st._id.toString(), st.name]));
    const discounts = await loadStoreDiscounts(ctx);
    return products.map(p => ({
      ...p,
      sellerAddress: addrMap.get(p.sellerId) ?? "",
      storeName: p.storeId ? (storeMap.get(p.storeId.toString()) ?? "") : "",
      storeDiscount: p.storeId ? discounts.get(p.storeId) : undefined,
    }));
  },
});

export const add = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: categoryValidator,
    brand: v.optional(v.string()),
    condition: conditionValidator,
    price: v.number(),
    photos: v.array(v.string()),
    featured: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    storeId: v.optional(v.id("stores")),
    stock: v.optional(v.number()),
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    const seller = await requireCurrentSeller(ctx);
    validateListingInput(args);
    const { store, storeId } = await resolveStoreListing(ctx, seller, args.storeId, args.stock);
    // Check for active offer and adjust fee accordingly
    const today = new Date().toISOString().slice(0, 10);
    const allOffers = await ctx.db.query("offers")
      .filter(q => q.eq(q.field("isActive"), true)).collect();
    const activeOffer = allOffers.find(o => o.startDate <= today && o.endDate >= today);
    const profit = resolveProfit(args.price, store ?? seller, activeOffer ?? null);
    const seq = await issueSeq(ctx);
    const id = await ctx.db.insert("products", {
      ...args,
      // Store products are always new.
      condition: store ? "new" : args.condition,
      storeId,
      seq,
      city: store?.city || seller.city || "Erbil",
      sellerId: seller._id.toString(),
      sellerName: seller.name,
      sellerPhone: seller.phone ?? "",
      profit,
      status: "pending",
      views: 0,
      dateAdded: new Date().toISOString(),
    });
    await ctx.db.insert("notifications", {
      sellerId: "ADMIN",
      productId: id,
      message: `New product submitted: "${args.title}" by ${seller.name}`,
      url: "/admin/products?tab=pending",
      read: false,
      createdAt: new Date().toISOString(),
    });
    await ctx.db.insert("adminLogs", {
      action: "product_posted",
      productId: id.toString(),
      productTitle: args.title,
      productCode: seq,
      sellerName: seller.name,
      price: args.price,
      createdAt: new Date().toISOString(),
    });
    return id;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("products"),
    status: productStatusValidator,
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.string()),
    notes: v.optional(v.string()),
    dateSold: v.optional(v.string()),
    // Price the buyer actually paid, when it differs from the listed price.
    salePrice: v.optional(v.number()),
  },
  handler: async (ctx, { id, salePrice, ...fields }) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(id);
    if (!product) throw new Error("Product not found");
    const patch: Record<string, unknown> = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );
    if (fields.status === "sold" || fields.status === "paid") {
      Object.assign(patch, await saleTerms(ctx, product, salePrice));
    } else if (product.salePrice !== undefined) {
      // Sale reversed (back to approved/pending/...): restore price and fee.
      Object.assign(patch, await listingTerms(ctx, product));
    }
    await ctx.db.patch(id, patch);
  },
});

// Stocked store products: selling one unit takes it off the stock and records
// it as its own sold (fee pending) or paid copy of the listing, so the sold and
// paid tabs and earnings count every unit. The original stays approved and
// visible until its last unit, which uses the normal sold/paid status flow. A
// sold copy is later marked paid through the normal status menu.
export const markUnitSold = mutation({
  args: {
    id: v.id("products"),
    status: v.union(v.literal("sold"), v.literal("paid")),
    salePrice: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, { id, status, salePrice }) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(id);
    if (!product) throw new Error("Product not found");
    if (product.status !== "approved") throw new Error("Only approved products can be sold");
    const stock = product.stock ?? 1;
    if (stock <= 1) throw new Error("Last unit: use the normal sold/paid status instead");

    const { _id, _creationTime, stock: _stock, featured: _featured, featuredUntil: _fu,
      featuredAt: _fa, featuredPosition: _fp, views: _views, ...snapshot } = product;
    const terms = await saleTerms(ctx, product, salePrice);
    await ctx.db.insert("products", {
      ...snapshot,
      ...terms,
      status,
      dateSold: new Date().toISOString(),
      soldFromId: id,
    });
    await ctx.db.patch(id, { stock: stock - 1 });
    return null;
  },
});

// Buyer changed their mind: a sold/paid unit goes back on the shelf. The unit
// entry is removed and its listing gets +1 stock. If that listing is gone or
// already sold out, the entry itself becomes a live single-unit listing again.
export const returnUnit = mutation({
  args: { id: v.id("products") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const unit = await ctx.db.get(id);
    if (!unit || !unit.soldFromId) throw new Error("Not a sold unit of a stocked product");
    if (unit.status !== "sold" && unit.status !== "paid") {
      throw new Error("Only sold or paid units can be returned");
    }
    const original = await ctx.db.get(unit.soldFromId);
    if (original && original.status === "approved") {
      await ctx.db.patch(original._id, { stock: (original.stock ?? 1) + 1 });
      await deleteProductData(ctx, unit);
    } else {
      await ctx.db.patch(id, {
        status: "approved",
        dateSold: undefined,
        soldFromId: undefined,
        ...(await listingTerms(ctx, unit)),
      });
    }
    return null;
  },
});

// Admin edit of a product's details, at any status. Store products are always
// "new", so their condition is kept as new whatever is sent.
export const adminUpdateDetails = mutation({
  args: {
    id: v.id("products"),
    title: v.string(),
    category: categoryValidator,
    brand: v.optional(v.string()),
    condition: conditionValidator,
    description: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { id, title, category, brand, condition, description }) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(id);
    if (!product) throw new ConvexError("Product not found");
    if (!title.trim()) throw new ConvexError("Title is required");
    await ctx.db.patch(id, {
      title: title.trim(),
      category,
      brand: brand?.trim() || undefined,
      condition: product.storeId ? "new" : condition,
      description: description.trim(),
    });
    return null;
  },
});

export const getById = query({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    const product = await ctx.db.get(id);
    if (!product) return null;

    const { user } = await getCurrentUser(ctx);
    if (isAdminUser(user)) return product;

    const seller = await requireCurrentSeller(ctx);
    if (product.sellerId !== seller._id.toString()) {
      throw new Error("Not authorized");
    }
    return product;
  },
});

export const sellerUpdate = mutation({
  args: {
    id: v.id("products"),
    title: v.string(),
    description: v.string(),
    category: categoryValidator,
    brand: v.optional(v.string()),
    condition: conditionValidator,
    price: v.number(),
    photos: v.array(v.string()),
    storeId: v.optional(v.id("stores")),
    stock: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, { id, ...fields }) => {
    const seller = await requireCurrentSeller(ctx);
    validateListingInput(fields);
    const { store, storeId } = await resolveStoreListing(ctx, seller, fields.storeId, fields.stock);
    const product = await ctx.db.get(id);
    if (!product) throw new Error("Product not found");
    if (product.sellerId !== seller._id.toString()) {
      throw new Error("Not authorized");
    }
    if (product.status === "sold" || product.status === "paid") {
      throw new Error("Cannot edit a sold or paid product");
    }
    if (product.status === "deletion_requested") {
      throw new Error("This product has a pending deletion request");
    }
    // Check for active offer and adjust fee accordingly
    const today = new Date().toISOString().slice(0, 10);
    const allOffers = await ctx.db.query("offers")
      .filter(q => q.eq(q.field("isActive"), true)).collect();
    const activeOffer = allOffers.find(o => o.startDate <= today && o.endDate >= today);
    const profit = resolveProfit(fields.price, store ?? seller, activeOffer ?? null);
    await ctx.db.patch(id, {
      ...fields,
      condition: store ? "new" : fields.condition,
      storeId,
      ...(store?.city ? { city: store.city } : {}),
      profit,
      status: "pending",
    });
    await ctx.db.insert("notifications", {
      sellerId: "ADMIN",
      productId: id,
      message: `Product resubmitted for review: "${fields.title}" by ${product.sellerName}`,
      url: "/admin/products?tab=pending",
      read: false,
      createdAt: new Date().toISOString(),
    });
    const oldPhotoCount = product.photos?.length ?? 0;
    const newPhotoCount = fields.photos?.length ?? 0;
    let photoNotes = "";
    if (newPhotoCount > oldPhotoCount) {
      photoNotes = `Added ${newPhotoCount - oldPhotoCount} photo(s)`;
    } else if (newPhotoCount < oldPhotoCount) {
      photoNotes = `Removed ${oldPhotoCount - newPhotoCount} photo(s)`;
    }
    await ctx.db.insert("adminLogs", {
      action: "product_edited",
      productId: id.toString(),
      productTitle: fields.title,
      productCode: product.seq,
      sellerName: product.sellerName,
      price: fields.price,
      notes: photoNotes || undefined,
      createdAt: new Date().toISOString(),
    });
    return null;
  },
});

export const requestDelete = mutation({
  args: { id: v.id("products"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, { id, reason }) => {
    const seller = await requireCurrentSeller(ctx);
    const product = await ctx.db.get(id);
    if (!product || product.sellerId !== seller._id.toString()) {
      throw new ConvexError("Not authorized");
    }
    if (product.status !== "approved" && product.status !== "pending" && product.status !== "rejected") {
      throw new ConvexError("This product cannot be requested for deletion");
    }
    const text = reason.trim();
    if (!text) throw new ConvexError("Please give a reason");
    if (text.length > 300) throw new ConvexError("Reason is too long");

    const now = new Date().toISOString();
    await ctx.db.patch(id, {
      status: "deletion_requested",
      deleteRequestedAt: now,
      deleteRequestReason: text,
      deleteRequestFrom: product.status,
    });
    await ctx.db.insert("notifications", {
      sellerId: "ADMIN",
      productId: id,
      message: `Deletion requested: "${product.title}" by ${seller.name}`,
      url: "/admin/products?tab=deletion_requested",
      read: false,
      createdAt: now,
    });
    await ctx.db.insert("adminLogs", {
      action: "delete_requested",
      productId: id.toString(),
      productTitle: product.title,
      productCode: product.seq,
      sellerName: seller.name,
      price: product.price,
      notes: text,
      createdAt: now,
    });
    return null;
  },
});

// Admin decision on a deletion request: delete it, put it back live, or record
// that it sold (so the service fee is still tracked).
export const resolveDeleteRequest = mutation({
  args: {
    id: v.id("products"),
    action: v.union(v.literal("approve"), v.literal("reject"), v.literal("sold")),
  },
  returns: v.null(),
  handler: async (ctx, { id, action }) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(id);
    if (!product) throw new ConvexError("Product not found");
    if (product.status !== "deletion_requested") {
      throw new ConvexError("This product has no pending deletion request");
    }
    if (action === "approve") {
      await deleteProductData(ctx, product);
    } else if (action === "reject") {
      await ctx.db.patch(id, {
        status: product.deleteRequestFrom ?? "approved",
        deleteRequestedAt: undefined,
        deleteRequestReason: undefined,
        deleteRequestFrom: undefined,
      });
    } else {
      if (product.deleteRequestFrom === "pending" || product.deleteRequestFrom === "rejected") {
        throw new ConvexError("This product was never approved, so it cannot be marked sold.");
      }
      if ((product.stock ?? 1) > 1) {
        throw new ConvexError("This product has several units in stock. Reject the request and sell units one at a time.");
      }
      await ctx.db.patch(id, {
        status: "sold",
        dateSold: new Date().toISOString(),
        deleteRequestedAt: undefined,
        deleteRequestReason: undefined,
        deleteRequestFrom: undefined,
        ...(await saleTerms(ctx, product)),
      });
    }
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const { user } = await requireAdmin(ctx);
    const product = await ctx.db.get(id);
    if (!product) return null;
    await deleteProductData(ctx, product);
    await ctx.db.insert("adminLogs", {
      action: "product_deleted",
      productId: id.toString(),
      productTitle: product.title,
      productCode: product.seq,
      sellerName: product.sellerName,
      price: product.price,
      adminName: user!.name,
      createdAt: new Date().toISOString(),
    });
    return null;
  },
});

export const adminUpdatePhotos = mutation({
  args: {
    id:     v.id("products"),
    photos: v.optional(v.array(v.string())),
    mainPhotoIndex: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, { id, photos, mainPhotoIndex }) => {
    await requireAdmin(ctx);
    const patch: any = {};
    if (photos !== undefined) {
      if (
        photos.length < 1 ||
        photos.length > 5 ||
        photos.some((photo) => !photo.trim())
      ) {
        throw new Error("A product must have between 1 and 5 photos");
      }
      patch.photos = photos;
    }
    if (mainPhotoIndex !== undefined) {
      patch.mainPhotoIndex = mainPhotoIndex;
    }
    await ctx.db.patch(id, patch);
    return null;
  },
});

export const setFeatured = mutation({
  args: {
    id:                v.id("products"),
    featured:          v.boolean(),
    featuredUntil:     v.optional(v.string()), // "YYYY-MM-DD"
    featuredPosition:  v.optional(v.number()), // 1-10 or undefined
  },
  handler: async (ctx, { id, featured, featuredUntil, featuredPosition }) => {
    await requireAdmin(ctx);
    const validatedPosition = featuredPosition && featuredPosition >= 1 && featuredPosition <= 10 ? featuredPosition : undefined;
    await ctx.db.patch(id, {
      featured,
      featuredUntil: featured ? featuredUntil : undefined,
      featuredAt: featured ? new Date().toISOString() : undefined,
      featuredPosition: featured ? validatedPosition : undefined,
    });
  },
});

// Automatically unfeatured products with expired featuredUntil dates
export const cleanupExpiredFeatured = mutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    console.log(`[Cleanup] Running at ${today}`);

    const products = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("featured"), true))
      .collect();

    console.log(`[Cleanup] Found ${products.length} featured products`);

    let unfeatureCount = 0;
    for (const product of products) {
      console.log(`[Cleanup] Checking ${product._id}: featuredUntil=${product.featuredUntil}`);

      // If product has an expiration date and it's in the past, unfeatured it
      if (product.featuredUntil && product.featuredUntil < today) {
        console.log(`[Cleanup] Unfeaturing ${product._id} (expired: ${product.featuredUntil} < ${today})`);
        await ctx.db.patch(product._id, {
          featured: false,
          featuredUntil: undefined,
          featuredPosition: undefined,
        });
        unfeatureCount++;
      }
    }

    console.log(`[Cleanup] Unfeatured ${unfeatureCount} products`);
    return { unfeatureCount, today };
  },
});

// Temporary query to check unique categories in database
export const getUniqueCategoriesDebug = query({
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const categories = new Set(products.map(p => p.category));
    return Array.from(categories).sort();
  },
});

// ⚠️ DEVELOPMENT ONLY: Clear all products from dev database
export const devClearAllProducts = mutation({
  args: { confirmDelete: v.boolean() },
  returns: v.object({ deletedCount: v.number() }),
  handler: async (ctx, { confirmDelete }) => {
    // Safety check: only works in development
    const isDev = process.env.ENVIRONMENT === "dev" || !process.env.ENVIRONMENT;
    if (!isDev) {
      throw new Error("❌ This mutation only works in development!");
    }

    if (!confirmDelete) {
      throw new Error("❌ You must confirm deletion by setting confirmDelete: true");
    }

    const products = await ctx.db.query("products").collect();
    let deletedCount = 0;

    for (const product of products) {
      await deleteProductData(ctx, product);
      deletedCount++;
    }

    console.log(`✓ [Dev] Deleted ${deletedCount} products from database`);
    return { deletedCount };
  },
});

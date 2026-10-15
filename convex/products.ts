import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
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

type PublicProduct = Omit<Doc<"products">, "sellerId" | "sellerPhone" | "profit" | "soldFromId">;

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
  storeName: v.optional(v.string()),
});

const toPublic = ({
  sellerId: _sellerId,
  sellerPhone: _sellerPhone,
  profit: _profit,
  soldFromId: _soldFromId,
  ...rest
}: Doc<"products">): PublicProduct => rest;

async function generateSeq(ctx: QueryCtx | MutationCtx): Promise<string> {
  const yy = String(new Date().getFullYear()).slice(-2); // "26"
  const prefix = `${yy}-`;
  const all = await ctx.db.query("products").collect();
  const count = all.filter((p) => (p.seq ?? "").startsWith(prefix)).length;
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

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

// Resolves the optional store/stock on a listing. A store-owner account (linked
// to a store) is always locked to that store. Otherwise the store must be one the
// seller manages. Stock only makes sense for a store product.
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
  let store: Doc<"stores"> | null = linked;
  if (!store && storeId) {
    store = await ctx.db.get(storeId);
    if (!store || store.sellerId !== seller._id.toString()) throw new Error("Store not found");
  }
  if (!store) {
    if (stock !== undefined) throw new Error("Stock requires a store");
    return { store: null, storeId: undefined };
  }
  if (stock !== undefined && (!Number.isInteger(stock) || stock < 1 || stock > 9999)) {
    throw new Error("Stock must be a whole number between 1 and 9999");
  }
  return { store, storeId: store._id };
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
    const store = product.storeId ? await ctx.db.get(product.storeId) : null;
    return { ...toPublic(product), storeName: store?.name };
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
    return products
      .filter((p) => !inactiveIds.has(p.sellerId))
      .map(toPublic);
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
    return products
      .filter((p) => p._id !== excludeId && !inactiveIds.has(p.sellerId))
      .map(toPublic);
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
    return [...sortedPositioned, ...sortedUnpositioned].map(toPublic);
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
      page: result.page
        .filter((p) => !inactiveIds.has(p.sellerId))
        .map(toPublic),
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
    return products.map(p => ({
      ...p,
      sellerAddress: addrMap.get(p.sellerId) ?? "",
      storeName: p.storeId ? (storeMap.get(p.storeId.toString()) ?? "") : "",
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
    const seq = await generateSeq(ctx);
    const id = await ctx.db.insert("products", {
      ...args,
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
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );
    await ctx.db.patch(id, patch);
  },
});

// Stocked store products: selling one unit takes it off the stock and records
// it as its own sold (fee pending) or paid copy of the listing, so the sold and
// paid tabs and earnings count every unit. The original stays approved and
// visible until its last unit, which uses the normal sold/paid status flow. A
// sold copy is later marked paid through the normal status menu.
export const markUnitSold = mutation({
  args: { id: v.id("products"), status: v.union(v.literal("sold"), v.literal("paid")) },
  returns: v.null(),
  handler: async (ctx, { id, status }) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(id);
    if (!product) throw new Error("Product not found");
    if (product.status !== "approved") throw new Error("Only approved products can be sold");
    const stock = product.stock ?? 1;
    if (stock <= 1) throw new Error("Last unit: use the normal sold/paid status instead");

    const { _id, _creationTime, stock: _stock, featured: _featured, featuredUntil: _fu,
      featuredAt: _fa, featuredPosition: _fp, views: _views, ...snapshot } = product;
    await ctx.db.insert("products", {
      ...snapshot,
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
      });
    }
    return null;
  },
});

export const adminUpdateCategory = mutation({
  args: {
    id: v.id("products"),
    category: categoryValidator,
  },
  handler: async (ctx, { id, category }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { category });
  },
});

export const adminUpdateTitle = mutation({
  args: {
    id: v.id("products"),
    title: v.string(),
  },
  handler: async (ctx, { id, title }) => {
    await requireAdmin(ctx);
    if (!title.trim()) throw new Error("Title cannot be empty");
    await ctx.db.patch(id, { title: title.trim() });
  },
});

export const adminUpdateBrand = mutation({
  args: {
    id: v.id("products"),
    brand: v.string(),
  },
  handler: async (ctx, { id, brand }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { brand: brand.trim() || undefined });
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
    // Check for active offer and adjust fee accordingly
    const today = new Date().toISOString().slice(0, 10);
    const allOffers = await ctx.db.query("offers")
      .filter(q => q.eq(q.field("isActive"), true)).collect();
    const activeOffer = allOffers.find(o => o.startDate <= today && o.endDate >= today);
    const profit = resolveProfit(fields.price, store ?? seller, activeOffer ?? null);
    await ctx.db.patch(id, {
      ...fields,
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

export const duplicate = mutation({
  args: {
    id: v.id("products"),
  },
  handler: async (ctx, { id }) => {
    const seller = await requireCurrentSeller(ctx);
    const src = await ctx.db.get(id);
    if (!src || src.sellerId !== seller._id.toString()) {
      throw new Error("Not authorized");
    }

    // Check for active offer and adjust fee accordingly
    const today = new Date().toISOString().slice(0, 10);
    const allOffers = await ctx.db.query("offers")
      .filter(q => q.eq(q.field("isActive"), true)).collect();
    const activeOffer = allOffers.find(o => o.startDate <= today && o.endDate >= today);
    const srcStore = src.storeId ? await ctx.db.get(src.storeId) : null;
    const profit = resolveProfit(src.price, srcStore ?? seller, activeOffer ?? null);

    const seq = await generateSeq(ctx);
    const newId = await ctx.db.insert("products", {
      seq,
      title:       src.title,
      description: src.description,
      category:    src.category,
      condition:   src.condition,
      price:       src.price,
      storeId:     src.storeId,
      stock:       src.stock,
      profit,
      photos:      src.photos,
      city:        src.city,
      sellerId:    src.sellerId,
      sellerName:  src.sellerName,
      sellerPhone: src.sellerPhone,
      status:      "pending",
      featured:    false,
      views:       0,
      dateAdded:   new Date().toISOString(),
    });

    await ctx.db.insert("notifications", {
      sellerId:  "ADMIN",
      productId: newId,
      message:   `New product submitted: "${src.title}" by ${src.sellerName}`,
      url:       "/admin/products?tab=pending",
      read:      false,
      createdAt: new Date().toISOString(),
    });

    return newId;
  },
});

export const sellerRemove = mutation({
  args: {
    id: v.id("products"),
  },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const seller = await requireCurrentSeller(ctx);
    const product = await ctx.db.get(id);
    if (!product || product.sellerId !== seller._id.toString()) {
      throw new Error("Not authorized");
    }
    if (!["pending", "rejected"].includes(product.status)) {
      throw new Error("Only pending or rejected products can be deleted");
    }
    await deleteProductData(ctx, product);
    await ctx.db.insert("adminLogs", {
      action: "product_deleted",
      productId: id.toString(),
      productTitle: product.title,
      productCode: product.seq,
      sellerName: seller.name,
      price: product.price,
      createdAt: new Date().toISOString(),
    });
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

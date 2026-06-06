import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
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

type PublicProduct = Omit<Doc<"products">, "sellerId" | "sellerPhone" | "profit">;

const toPublic = ({
  sellerId: _sellerId,
  sellerPhone: _sellerPhone,
  profit: _profit,
  ...rest
}: Doc<"products">): PublicProduct => rest;

async function generateSeq(ctx: QueryCtx | MutationCtx): Promise<string> {
  const yy = String(new Date().getFullYear()).slice(-2); // "26"
  const prefix = `${yy}-`;
  const all = await ctx.db.query("products").collect();
  const count = all.filter((p) => (p.seq ?? "").startsWith(prefix)).length;
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

function calculateProfit(price: number): number {
  if (price >= 5000 && price <= 9000) return 2000;
  if (price >= 10000 && price <= 29000) return 3000;
  if (price >= 30000 && price <= 49000) return 4000;
  if (price >= 50000 && price <= 99000) return 5000;
  if (price >= 100000 && price <= 199000) return 10000;
  if (price >= 200000 && price <= 299000) return 15000;
  if (price >= 300000 && price <= 399000) return 20000;
  if (price >= 400000 && price <= 499000) return 25000;
  if (price >= 500000 && price <= 1000000) return 30000;
  return 0;
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

export const getPublicById = query({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    const product = await ctx.db.get(id);
    if (!product || product.status !== "approved") return null;
    const inactiveIds = await getInactiveSellerIds(ctx);
    if (inactiveIds.has(product.sellerId)) return null;
    return toPublic(product);
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

// Always returns currently-featured products regardless of their pagination position
export const getFeatured = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    const inactiveIds = await getInactiveSellerIds(ctx);
    const all = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
    return all
      .filter(
        (p) =>
          !inactiveIds.has(p.sellerId) &&
          p.featured &&
          (!p.featuredUntil || p.featuredUntil >= today),
      )
      .sort((a, b) => {
        // Sort by featuredAt descending (newest first)
        const aTime = a.featuredAt ? new Date(a.featuredAt).getTime() : 0;
        const bTime = b.featuredAt ? new Date(b.featuredAt).getTime() : 0;
        return bTime - aTime;
      })
      .map(toPublic);
  },
});

// Returns pinned products (max 20) for the buyer home page carousel
export const getPinned = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    const inactiveIds = await getInactiveSellerIds(ctx);
    const all = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
    return all
      .filter(
        (p) =>
          !inactiveIds.has(p.sellerId) &&
          p.pinned &&
          (!p.pinnedUntil || p.pinnedUntil >= today),
      )
      .sort((a, b) => {
        // Sort by pinnedAt descending (newest pinned first)
        const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
        const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
        return bTime - aTime;
      })
      .map(toPublic)
      .slice(0, 20); // Max 20 pinned products
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

export const getBySeller = query({
  args: {},
  handler: async (ctx) => {
    const seller = await requireCurrentSeller(ctx);
    return await ctx.db
      .query("products")
      .withIndex("by_seller", q => q.eq("sellerId", seller._id.toString()))
      .collect();
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
    return products.map(p => ({ ...p, sellerAddress: addrMap.get(p.sellerId) ?? "" }));
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
  },
  handler: async (ctx, args) => {
    const seller = await requireCurrentSeller(ctx);
    // Check for active offer and adjust fee accordingly
    const today = new Date().toISOString().slice(0, 10);
    const allOffers = await ctx.db.query("offers")
      .filter(q => q.eq(q.field("isActive"), true)).collect();
    const activeOffer = allOffers.find(o => o.startDate <= today && o.endDate >= today);
    const profit = activeOffer
      ? (activeOffer.type === "free" ? 0 : (activeOffer.flatFeeAmount ?? 0))
      : calculateProfit(args.price);
    const seq = await generateSeq(ctx);
    const id = await ctx.db.insert("products", {
      ...args,
      seq,
      city: seller.city || "Erbil",
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
    condition: conditionValidator,
    price: v.number(),
    photos: v.array(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const seller = await requireCurrentSeller(ctx);
    const product = await ctx.db.get(id);
    if (!product) throw new Error("Product not found");
    if (product.sellerId !== seller._id.toString()) {
      throw new Error("Not authorized");
    }
    if (product.status === "sold" || product.status === "paid") {
      throw new Error("Cannot edit a sold or paid product");
    }
    await ctx.db.patch(id, {
      ...fields,
      profit: calculateProfit(fields.price),
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

    const seq = await generateSeq(ctx);
    const newId = await ctx.db.insert("products", {
      seq,
      title:       src.title,
      description: src.description,
      category:    src.category,
      condition:   src.condition,
      price:       src.price,
      profit:      src.profit,
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
  handler: async (ctx, { id }) => {
    const seller = await requireCurrentSeller(ctx);
    const product = await ctx.db.get(id);
    if (!product || product.sellerId !== seller._id.toString()) {
      throw new Error("Not authorized");
    }
    if (!["pending", "rejected"].includes(product.status)) {
      throw new Error("Only pending or rejected products can be deleted");
    }
    await ctx.db.delete(id);
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});

export const adminUpdatePhotos = mutation({
  args: {
    id:     v.id("products"),
    photos: v.array(v.string()),
  },
  handler: async (ctx, { id, photos }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { photos });
  },
});

export const setFeatured = mutation({
  args: {
    id:            v.id("products"),
    featured:      v.boolean(),
    featuredUntil: v.optional(v.string()), // "YYYY-MM-DD"
  },
  handler: async (ctx, { id, featured, featuredUntil }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, {
      featured,
      featuredUntil: featured ? featuredUntil : undefined,
      featuredAt: featured ? new Date().toISOString() : undefined,
      pinned: featured ? false : undefined, // Remove pin when unfeatureing
      pinnedUntil: undefined,
      pinnedAt: undefined,
    });
  },
});

export const setPinned = mutation({
  args: {
    id:    v.id("products"),
    pinned: v.boolean(),
  },
  handler: async (ctx, { id, pinned }) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(id);
    if (!product) return;

    // Pin duration matches feature duration
    await ctx.db.patch(id, {
      pinned,
      pinnedUntil: pinned ? product.featuredUntil : undefined,
      pinnedAt: pinned ? new Date().toISOString() : undefined,
    });
  },
});

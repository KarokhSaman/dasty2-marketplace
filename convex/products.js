import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

async function generateSeq(ctx) {
  const yy = String(new Date().getFullYear()).slice(-2); // "26"
  const prefix = `${yy}-`;
  const all = await ctx.db.query("products").collect();
  const count = all.filter((p) => (p.seq ?? "").startsWith(prefix)).length;
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

function calculateProfit(price) {
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

const CATEGORY_VALIDATOR = v.union(
  v.literal("Strollers & Travel"),
  v.literal("Car Seats"),
  v.literal("Carry Cot"),
  v.literal("Bed"),
  v.literal("Feeding & Nursing"),
  v.literal("Bouncers & Swings"),
  v.literal("High Chairs"),
  v.literal("Toys & Play"),
  v.literal("Electronics & Monitors"),
  v.literal("Other")
);

export const getPublicById = query({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    const product = await ctx.db.get(id);
    if (!product || product.status !== "approved") return null;
    const { sellerId, sellerPhone, profit, ...rest } = product;
    return rest;
  },
});

export const getPublic = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_status", q => q.eq("status", "approved"))
      .collect();
    return products.map(({ sellerId, sellerPhone, profit, ...rest }) => rest);
  },
});

// Always returns currently-featured products regardless of their pagination position
export const getFeatured = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    const all = await ctx.db
      .query("products")
      .withIndex("by_status", q => q.eq("status", "approved"))
      .collect();
    return all
      .filter(p => p.featured && (!p.featuredUntil || p.featuredUntil >= today))
      .map(({ sellerId, sellerPhone, profit, ...rest }) => rest);
  },
});

// Paginated version — used by the buyer listing page
export const getPublicPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    category:       v.optional(v.string()),
  },
  handler: async (ctx, { paginationOpts, category }) => {
    const q = (category && category !== "all")
      ? ctx.db.query("products")
          .withIndex("by_status_category", q =>
            q.eq("status", "approved").eq("category", category))
      : ctx.db.query("products")
          .withIndex("by_status", q => q.eq("status", "approved"));

    const result = await q.order("desc").paginate(paginationOpts);
    return {
      ...result,
      page: result.page.map(({ sellerId, sellerPhone, profit, ...rest }) => rest),
    };
  },
});

export const getBySeller = query({
  args: { sellerId: v.string() },
  handler: async (ctx, { sellerId }) => {
    return await ctx.db
      .query("products")
      .withIndex("by_seller", q => q.eq("sellerId", sellerId))
      .collect();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const sellers  = await ctx.db.query("sellers").collect();
    const addrMap  = new Map(sellers.map(s => [s._id.toString(), s.address ?? ""]));
    return products.map(p => ({ ...p, sellerAddress: addrMap.get(p.sellerId) ?? "" }));
  },
});

export const add = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: CATEGORY_VALIDATOR,
    condition: v.union(v.literal("new"), v.literal("used")),
    price: v.number(),
    photos: v.array(v.string()),
    city: v.optional(v.string()),
    sellerId: v.string(),
    sellerName: v.string(),
    sellerPhone: v.string(),
    featured: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    dateAdded: v.string(),
  },
  handler: async (ctx, args) => {
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
      city: args.city ?? "Erbil",
      profit,
      status: "pending",
      views: 0,
    });
    await ctx.db.insert("notifications", {
      sellerId: "ADMIN",
      productId: id,
      message: `New product submitted: "${args.title}" by ${args.sellerName}`,
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
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("sold"),
      v.literal("paid")
    ),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.string()),
    notes: v.optional(v.string()),
    dateSold: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, patch);
  },
});

export const getById = query({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const sellerUpdate = mutation({
  args: {
    id: v.id("products"),
    sellerId: v.string(),
    title: v.string(),
    description: v.string(),
    category: CATEGORY_VALIDATOR,
    condition: v.union(v.literal("new"), v.literal("used")),
    price: v.number(),
    photos: v.array(v.string()),
  },
  handler: async (ctx, { id, sellerId, ...fields }) => {
    const product = await ctx.db.get(id);
    if (!product) throw new Error("Product not found");
    if (product.sellerId !== sellerId) throw new Error("Not authorized");
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
    sellerId: v.string(),
  },
  handler: async (ctx, { id, sellerId }) => {
    const src = await ctx.db.get(id);
    if (!src || src.sellerId !== sellerId) throw new Error("Not authorized");

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
    sellerId: v.string(),
  },
  handler: async (ctx, { id, sellerId }) => {
    const product = await ctx.db.get(id);
    if (!product || product.sellerId !== sellerId) throw new Error("Not authorized");
    if (!["pending", "rejected"].includes(product.status)) {
      throw new Error("Only pending or rejected products can be deleted");
    }
    await ctx.db.delete(id);
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const setFeatured = mutation({
  args: {
    id:            v.id("products"),
    featured:      v.boolean(),
    featuredUntil: v.optional(v.string()), // "YYYY-MM-DD"
  },
  handler: async (ctx, { id, featured, featuredUntil }) => {
    await ctx.db.patch(id, {
      featured,
      featuredUntil: featured ? featuredUntil : undefined,
    });
  },
});

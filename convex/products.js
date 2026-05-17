import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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

export const getPublic = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("status"), "approved"))
      .collect();

    return products.map(({ sellerId, sellerPhone, profit, ...rest }) => rest);
  },
});

export const getBySeller = query({
  args: { sellerId: v.string() },
  handler: async (ctx, { sellerId }) => {
    return await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("sellerId"), sellerId))
      .collect();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("products").collect();
  },
});

export const add = mutation({
  args: {
    seq: v.string(),
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("Carrycot"),
      v.literal("Carrier"),
      v.literal("Carseat"),
      v.literal("Electrics"),
      v.literal("Fabric"),
      v.literal("Highchair"),
      v.literal("Jolana"),
      v.literal("Jumper"),
      v.literal("Mastela"),
      v.literal("Next2me"),
      v.literal("Rawrawa"),
      v.literal("Sisam"),
      v.literal("Shirdosh"),
      v.literal("Stroller"),
      v.literal("Yary u sht"),
      v.literal("Other")
    ),
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
    const profit = calculateProfit(args.price);
    return await ctx.db.insert("products", {
      ...args,
      city: args.city ?? "Erbil",
      profit,
      status: "pending",
      views: 0,
    });
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

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

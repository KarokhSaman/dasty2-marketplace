import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    adminEmail:   v.string(),
    action:       v.string(),
    productId:    v.optional(v.string()),
    productTitle: v.optional(v.string()),
    sellerName:   v.optional(v.string()),
    price:        v.optional(v.number()),
    notes:        v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("adminLogs", {
      ...args,
      createdAt: new Date().toISOString(),
    });
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return (await ctx.db.query("adminLogs").collect())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
});

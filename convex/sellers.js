import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const register = mutation({
  args: {
    clerkUserId: v.string(),
    name: v.string(),
    phone: v.string(),
    city: v.string(),
    registeredAt: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sellers")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("sellers", {
      ...args,
      isActive: true,
    });
  },
});

export const getByClerkId = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    return await ctx.db
      .query("sellers")
      .filter((q) => q.eq(q.field("clerkUserId"), clerkUserId))
      .first();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("sellers").collect();
  },
});

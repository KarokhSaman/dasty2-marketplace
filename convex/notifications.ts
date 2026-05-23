import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getBySeller = query({
  args: { sellerId: v.string() },
  handler: async (ctx, { sellerId }) => {
    return await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("sellerId"), sellerId))
      .collect();
  },
});

export const getUnreadCount = query({
  args: { sellerId: v.string() },
  handler: async (ctx, { sellerId }) => {
    const all = await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("sellerId"), sellerId))
      .collect();
    return all.filter((n) => !n.read).length;
  },
});

export const markAllRead = mutation({
  args: { sellerId: v.string() },
  handler: async (ctx, { sellerId }) => {
    const unread = await ctx.db
      .query("notifications")
      .filter((q) =>
        q.and(q.eq(q.field("sellerId"), sellerId), q.eq(q.field("read"), false)),
      )
      .collect();
    for (const n of unread) {
      await ctx.db.patch(n._id, { read: true });
    }
  },
});

export const create = mutation({
  args: {
    sellerId: v.string(),
    productId: v.string(),
    message: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      ...args,
      read: false,
      createdAt: new Date().toISOString(),
    });
  },
});

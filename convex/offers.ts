import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./auth";
import { offerTypeValidator } from "./types";

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    const all = await ctx.db
      .query("offers")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
    return all.find(o => o.startDate <= today && o.endDate >= today) ?? null;
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return (await ctx.db.query("offers").collect())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
});

export const create = mutation({
  args: {
    title:         v.string(),
    description:   v.string(),
    type:          offerTypeValidator,
    flatFeeAmount: v.optional(v.number()),
    startDate:     v.string(),
    endDate:       v.string(),
  },
  handler: async (ctx, args) => {
    const { email: adminEmail } = await requireAdmin(ctx);

    const offerId = await ctx.db.insert("offers", {
      ...args,
      isActive:  true,
      createdAt: new Date().toISOString(),
    });

    // Notify every active seller
    const sellers = await ctx.db
      .query("users")
      .withIndex("by_role_and_isActive", (q) =>
        q.eq("role", "seller").eq("isActive", true),
      )
      .collect();

    const feeText = args.type === "free"
      ? "No service fee"
      : `Fixed fee of ${args.flatFeeAmount?.toLocaleString()} IQD`;

    const message = `🎉 Special Offer: ${args.title} — ${feeText} (${args.startDate} to ${args.endDate})`;

    for (const seller of sellers) {
      await ctx.db.insert("notifications", {
        sellerId:  seller._id.toString(),
        productId: offerId.toString(),
        message,
        url:       "/seller",
        read:      false,
        createdAt: new Date().toISOString(),
      });
    }

    // Log the action
    await ctx.db.insert("adminLogs", {
      adminEmail,
      action:       "offer_created",
      productTitle: args.title,
      notes:        `${args.type === "free" ? "No fee" : `Flat ${args.flatFeeAmount?.toLocaleString()} IQD`} · ${args.startDate} → ${args.endDate}`,
      createdAt:    new Date().toISOString(),
    });

    return offerId;
  },
});

export const deactivate = mutation({
  args: { id: v.id("offers") },
  handler: async (ctx, { id }) => {
    const { email: adminEmail } = await requireAdmin(ctx);

    const offer = await ctx.db.get(id);
    await ctx.db.patch(id, { isActive: false });
    await ctx.db.insert("adminLogs", {
      adminEmail,
      action:       "offer_deactivated",
      productTitle: offer?.title,
      createdAt:    new Date().toISOString(),
    });
  },
});

export const reactivate = mutation({
  args: { id: v.id("offers") },
  handler: async (ctx, { id }) => {
    const { email: adminEmail } = await requireAdmin(ctx);

    const offer = await ctx.db.get(id);
    await ctx.db.patch(id, { isActive: true });
    await ctx.db.insert("adminLogs", {
      adminEmail,
      action:       "offer_reactivated",
      productTitle: offer?.title,
      createdAt:    new Date().toISOString(),
    });
  },
});

export const deleteOffer = mutation({
  args: { id: v.id("offers") },
  handler: async (ctx, { id }) => {
    const { email: adminEmail } = await requireAdmin(ctx);

    const offer = await ctx.db.get(id);
    await ctx.db.delete(id);
    await ctx.db.insert("adminLogs", {
      adminEmail,
      action:       "offer_deleted",
      productTitle: offer?.title,
      createdAt:    new Date().toISOString(),
    });
  },
});

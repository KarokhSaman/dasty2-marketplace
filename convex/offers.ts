import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
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

type OfferFields = {
  title: string;
  type: "free" | "flat_fee";
  flatFeeAmount?: number;
  maxPrice?: number;
  startDate: string;
  endDate: string;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function validateOffer(o: OfferFields) {
  if (!o.title.trim()) throw new ConvexError("Give the offer a name");
  if (!DATE.test(o.startDate) || !DATE.test(o.endDate)) throw new ConvexError("Choose a start and an end date");
  if (o.endDate < o.startDate) throw new ConvexError("The end date is before the start date");
  if (o.type === "flat_fee" && !(Number.isInteger(o.flatFeeAmount) && (o.flatFeeAmount ?? 0) > 0)) {
    throw new ConvexError("The flat fee must be a whole number of IQD");
  }
  if (o.maxPrice !== undefined && !(Number.isInteger(o.maxPrice) && o.maxPrice > 0)) {
    throw new ConvexError("The price limit must be a whole number of IQD");
  }
}

// Only one offer may run on any day, so a product's fee is never ambiguous.
async function assertNoOverlap(ctx: MutationCtx, startDate: string, endDate: string, exceptId?: Id<"offers">) {
  const active = await ctx.db
    .query("offers")
    .withIndex("by_isActive", (q) => q.eq("isActive", true))
    .collect();
  const clash = active.find((o) => o._id !== exceptId && o.startDate <= endDate && o.endDate >= startDate);
  if (clash) {
    throw new ConvexError(`Overlaps "${clash.title}" (${clash.startDate} to ${clash.endDate}). Only one offer can run at a time.`);
  }
}

// Edit an offer (its name, fee, price limit or dates — e.g. extend it). Products
// already posted under it keep pointing at it, so their fee follows the edit.
export const update = mutation({
  args: {
    id: v.id("offers"),
    title: v.string(),
    description: v.string(),
    type: offerTypeValidator,
    flatFeeAmount: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { id, ...fields }) => {
    const { user } = await requireAdmin(ctx);
    const offer = await ctx.db.get(id);
    if (!offer) throw new ConvexError("Offer not found");
    validateOffer(fields);
    if (offer.isActive) await assertNoOverlap(ctx, fields.startDate, fields.endDate, id);
    await ctx.db.patch(id, {
      ...fields,
      title: fields.title.trim(),
      flatFeeAmount: fields.type === "flat_fee" ? fields.flatFeeAmount : undefined,
    });
    await ctx.db.insert("adminLogs", {
      adminName: user!.name,
      action: "offer_edited",
      productTitle: fields.title.trim(),
      notes: `${fields.type === "free" ? "No fee" : `Flat ${fields.flatFeeAmount?.toLocaleString()} IQD`}${fields.maxPrice ? ` · under ${fields.maxPrice.toLocaleString()} IQD` : ""} · ${fields.startDate} → ${fields.endDate}`,
      createdAt: new Date().toISOString(),
    });
    return null;
  },
});

export const create = mutation({
  args: {
    title:         v.string(),
    description:   v.string(),
    type:          offerTypeValidator,
    flatFeeAmount: v.optional(v.number()),
    maxPrice:      v.optional(v.number()),
    startDate:     v.string(),
    endDate:       v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx);
    validateOffer(args);
    await assertNoOverlap(ctx, args.startDate, args.endDate);

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

    const limitText = args.maxPrice ? ` on products under ${args.maxPrice.toLocaleString()} IQD` : "";
    const message = `🎉 Special Offer: ${args.title} — ${feeText}${limitText} (${args.startDate} to ${args.endDate})`;

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
      adminName:    user!.name,
      action:       "offer_created",
      productTitle: args.title,
      notes:        `${args.type === "free" ? "No fee" : `Flat ${args.flatFeeAmount?.toLocaleString()} IQD`}${args.maxPrice ? ` · under ${args.maxPrice.toLocaleString()} IQD` : ""} · ${args.startDate} → ${args.endDate}`,
      createdAt:    new Date().toISOString(),
    });

    return offerId;
  },
});

export const deactivate = mutation({
  args: { id: v.id("offers") },
  handler: async (ctx, { id }) => {
    const { user } = await requireAdmin(ctx);

    const offer = await ctx.db.get(id);
    await ctx.db.patch(id, { isActive: false });
    await ctx.db.insert("adminLogs", {
      adminName:    user!.name,
      action:       "offer_deactivated",
      productTitle: offer?.title,
      createdAt:    new Date().toISOString(),
    });
  },
});

export const reactivate = mutation({
  args: { id: v.id("offers") },
  handler: async (ctx, { id }) => {
    const { user } = await requireAdmin(ctx);

    const offer = await ctx.db.get(id);
    if (!offer) throw new ConvexError("Offer not found");
    await assertNoOverlap(ctx, offer.startDate, offer.endDate, id);
    await ctx.db.patch(id, { isActive: true });
    await ctx.db.insert("adminLogs", {
      adminName:    user!.name,
      action:       "offer_reactivated",
      productTitle: offer?.title,
      createdAt:    new Date().toISOString(),
    });
  },
});

export const deleteOffer = mutation({
  args: { id: v.id("offers") },
  handler: async (ctx, { id }) => {
    const { user } = await requireAdmin(ctx);

    const offer = await ctx.db.get(id);
    await ctx.db.delete(id);
    await ctx.db.insert("adminLogs", {
      adminName:    user!.name,
      action:       "offer_deleted",
      productTitle: offer?.title,
      createdAt:    new Date().toISOString(),
    });
  },
});

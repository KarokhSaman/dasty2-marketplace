import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAdmin, requireCurrentSeller } from "./auth";
import { feeModeValidator } from "./types";

const storeValidator = v.object({
  _id: v.id("stores"),
  _creationTime: v.number(),
  name: v.string(),
  sellerId: v.string(),
  linkedUserId: v.optional(v.id("users")),
  city: v.optional(v.string()),
  hideFromFilter: v.optional(v.boolean()),
  discountPercent: v.optional(v.number()),
  discountStart: v.optional(v.string()),
  discountEnd: v.optional(v.string()),
  feeMode: v.optional(feeModeValidator),
  feeValue: v.optional(v.number()),
  createdAt: v.string(),
});

// The signed-in seller's own stores (drives the store/stock fields on the
// add-product page — sellers with no stores see nothing different).
export const listMine = query({
  args: {},
  returns: v.array(storeValidator),
  handler: async (ctx) => {
    const seller = await requireCurrentSeller(ctx);
    return await ctx.db
      .query("stores")
      .withIndex("by_seller", (q) => q.eq("sellerId", seller._id.toString()))
      .collect();
  },
});

// The store this seller account is linked to as the store owner, if any.
export const getLinked = query({
  args: {},
  returns: v.union(v.null(), storeValidator),
  handler: async (ctx) => {
    const seller = await requireCurrentSeller(ctx);
    return await ctx.db
      .query("stores")
      .withIndex("by_linked_user", (q) => q.eq("linkedUserId", seller._id))
      .first();
  },
});

export const listAll = query({
  args: {},
  returns: v.array(storeValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("stores").collect();
  },
});

function validateFee(feeMode: string, feeValue: number | undefined) {
  if (feeMode === "flat") {
    if (feeValue === undefined || !Number.isInteger(feeValue) || feeValue <= 0) {
      throw new ConvexError("Flat fee must be a whole number of IQD greater than 0");
    }
  } else if (feeMode === "percentage") {
    if (feeValue === undefined || !(feeValue > 0 && feeValue <= 100)) {
      throw new ConvexError("Percentage must be between 0 and 100");
    }
  }
}

// A linked (store owner) account must be a different seller and linked to at
// most one store. It may also manage other stores: its add-product page then
// offers its own store plus the ones it manages.
async function validateLink(
  ctx: QueryCtx,
  managerId: string,
  linkedUserId: Id<"users"> | undefined,
  currentStoreId?: Id<"stores">,
) {
  if (!linkedUserId) return;
  if (linkedUserId.toString() === managerId) {
    throw new ConvexError("The linked account must be different from the managing seller");
  }
  const user = await ctx.db.get(linkedUserId);
  if (!user || user.role !== "seller") throw new ConvexError("Linked account must be a seller");
  const existing = await ctx.db
    .query("stores")
    .withIndex("by_linked_user", (q) => q.eq("linkedUserId", linkedUserId))
    .first();
  if (existing && existing._id !== currentStoreId) {
    throw new ConvexError("That account is already linked to another store");
  }
}

export const create = mutation({
  args: {
    sellerId: v.id("users"),
    name: v.string(),
    feeMode: feeModeValidator,
    feeValue: v.optional(v.number()),
    linkedUserId: v.optional(v.id("users")),
    city: v.optional(v.string()),
  },
  returns: v.id("stores"),
  handler: async (ctx, { sellerId, name, feeMode, feeValue, linkedUserId, city }) => {
    await requireAdmin(ctx);
    const seller = await ctx.db.get(sellerId);
    if (!seller || seller.role !== "seller") throw new ConvexError("Seller not found");
    if (!name.trim()) throw new ConvexError("Store name is required");
    validateFee(feeMode, feeValue);
    await validateLink(ctx, sellerId.toString(), linkedUserId);
    const hasValue = feeMode === "flat" || feeMode === "percentage";
    return await ctx.db.insert("stores", {
      name: name.trim(),
      sellerId: sellerId.toString(),
      linkedUserId,
      city: city || undefined,
      feeMode: feeMode === "default" ? undefined : feeMode,
      feeValue: hasValue ? feeValue : undefined,
      createdAt: new Date().toISOString(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("stores"),
    name: v.string(),
    feeMode: feeModeValidator,
    feeValue: v.optional(v.number()),
    linkedUserId: v.optional(v.id("users")),
    city: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { id, name, feeMode, feeValue, linkedUserId, city }) => {
    await requireAdmin(ctx);
    const store = await ctx.db.get(id);
    if (!store) throw new ConvexError("Store not found");
    if (!name.trim()) throw new ConvexError("Store name is required");
    validateFee(feeMode, feeValue);
    await validateLink(ctx, store.sellerId, linkedUserId, id);
    const hasValue = feeMode === "flat" || feeMode === "percentage";
    await ctx.db.patch(id, {
      linkedUserId,
      city: city || undefined,
      name: name.trim(),
      feeMode: feeMode === "default" ? undefined : feeMode,
      feeValue: hasValue ? feeValue : undefined,
    });
    // Existing products of the store (including sold/paid unit entries) follow
    // the store's city, so the store never shows up in two cities.
    if (city && city !== store.city) {
      const products = await ctx.db
        .query("products")
        .withIndex("by_store", (q) => q.eq("storeId", id))
        .collect();
      for (const p of products) {
        if (p.city !== city) await ctx.db.patch(p._id, { city });
      }
    }
    return null;
  },
});

// Set or clear a store's discount. Passing no percent clears it.
export const setDiscount = mutation({
  args: {
    id: v.id("stores"),
    percent: v.optional(v.number()),
    start: v.optional(v.string()),
    end: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { id, percent, start, end }) => {
    await requireAdmin(ctx);
    const store = await ctx.db.get(id);
    if (!store) throw new ConvexError("Store not found");
    if (percent === undefined) {
      await ctx.db.patch(id, {
        discountPercent: undefined,
        discountStart: undefined,
        discountEnd: undefined,
      });
      return null;
    }
    if (!(percent > 0 && percent <= 90)) throw new ConvexError("Discount must be between 1 and 90 percent");
    const date = /^\d{4}-\d{2}-\d{2}$/;
    if (!start || !end || !date.test(start) || !date.test(end)) {
      throw new ConvexError("Choose a start and an end date");
    }
    if (end < start) throw new ConvexError("The end date must not be before the start date");
    await ctx.db.patch(id, { discountPercent: percent, discountStart: start, discountEnd: end });
    return null;
  },
});

// Products keep their stored fee; deleting a store only detaches them from it.
export const remove = mutation({
  args: { id: v.id("stores") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const store = await ctx.db.get(id);
    if (!store) throw new ConvexError("Store not found");
    const products = await ctx.db
      .query("products")
      .withIndex("by_seller", (q) => q.eq("sellerId", store.sellerId))
      .collect();
    for (const p of products) {
      if (p.storeId === id) await ctx.db.patch(p._id, { storeId: undefined });
    }
    await ctx.db.delete(id);
    return null;
  },
});

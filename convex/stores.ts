import { v } from "convex/values";
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

// Stores that currently have at least one live product — feeds the buyer home
// page store filter. Public: only id and name are exposed.
export const listPublic = query({
  args: {},
  returns: v.array(v.object({ _id: v.id("stores"), name: v.string() })),
  handler: async (ctx) => {
    const inactive = await ctx.db
      .query("users")
      .withIndex("by_role_and_isActive", (q) => q.eq("role", "seller").eq("isActive", false))
      .collect();
    const inactiveIds = new Set(inactive.map((u) => u._id.toString()));
    const approved = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
    const storeIds = new Set<Id<"stores">>();
    for (const p of approved) {
      if (p.storeId && !inactiveIds.has(p.sellerId)) storeIds.add(p.storeId);
    }
    const stores = [];
    for (const id of storeIds) {
      const store = await ctx.db.get(id);
      if (store) stores.push({ _id: store._id, name: store.name });
    }
    return stores.sort((a, b) => a.name.localeCompare(b.name));
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
      throw new Error("Flat fee must be a whole number of IQD greater than 0");
    }
  } else if (feeMode === "percentage") {
    if (feeValue === undefined || !(feeValue > 0 && feeValue <= 100)) {
      throw new Error("Percentage must be between 0 and 100");
    }
  }
}

// A linked account must be a different seller, linked to at most one store, and
// must not itself manage stores (so its add-product page has one clear store).
async function validateLink(
  ctx: QueryCtx,
  managerId: string,
  linkedUserId: Id<"users"> | undefined,
  currentStoreId?: Id<"stores">,
) {
  if (!linkedUserId) return;
  if (linkedUserId.toString() === managerId) {
    throw new Error("The linked account must be different from the managing seller");
  }
  const user = await ctx.db.get(linkedUserId);
  if (!user || user.role !== "seller") throw new Error("Linked account must be a seller");
  const existing = await ctx.db
    .query("stores")
    .withIndex("by_linked_user", (q) => q.eq("linkedUserId", linkedUserId))
    .first();
  if (existing && existing._id !== currentStoreId) {
    throw new Error("That account is already linked to another store");
  }
  const managed = await ctx.db
    .query("stores")
    .withIndex("by_seller", (q) => q.eq("sellerId", linkedUserId.toString()))
    .first();
  if (managed) throw new Error("That account manages stores, so it cannot be a store owner account");
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
    if (!seller || seller.role !== "seller") throw new Error("Seller not found");
    if (!name.trim()) throw new Error("Store name is required");
    validateFee(feeMode, feeValue);
    const sellerIsLinked = await ctx.db
      .query("stores")
      .withIndex("by_linked_user", (q) => q.eq("linkedUserId", sellerId))
      .first();
    if (sellerIsLinked) {
      throw new Error("This seller is a store owner account, so it cannot manage stores");
    }
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
    if (!store) throw new Error("Store not found");
    if (!name.trim()) throw new Error("Store name is required");
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

// Products keep their stored fee; deleting a store only detaches them from it.
export const remove = mutation({
  args: { id: v.id("stores") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const store = await ctx.db.get(id);
    if (!store) throw new Error("Store not found");
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

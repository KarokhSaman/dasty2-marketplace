import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("sellers")
      .filter((q) => q.eq(q.field("email"), email))
      .first();
  },
});

export const createWithEmail = mutation({
  args: {
    email:   v.string(),
    name:    v.string(),
    phone:   v.string(),
    city:    v.string(),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sellers")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("sellers", {
      ...args,
      clerkUserId: "",
      registeredAt: new Date().toISOString(),
      isActive: true,
    });
  },
});

export const getById = query({
  args: { id: v.id("sellers") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
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

export const create = mutation({
  args: {
    clerkUserId: v.optional(v.string()),
    email: v.optional(v.string()),
    name: v.string(),
    phone: v.string(),
    city: v.string(),
    registeredAt: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sellers")
      .filter((q) =>
        args.email
          ? q.eq(q.field("email"), args.email)
          : q.eq(q.field("clerkUserId"), args.clerkUserId ?? ""),
      )
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("sellers", {
      ...args,
      clerkUserId: args.clerkUserId ?? "",
      isActive: true,
    });
  },
});

export const setActive = mutation({
  args: { id: v.id("sellers"), isActive: v.boolean() },
  handler: async (ctx, { id, isActive }) => {
    await ctx.db.patch(id, { isActive });
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("sellers").collect();
  },
});

export const updateProfile = mutation({
  args: {
    id:      v.id("sellers"),
    name:    v.string(),
    phone:   v.string(),
    city:    v.string(),
    address: v.optional(v.string()),
  },
  handler: async (ctx, { id, name, phone, city, address }) => {
    await ctx.db.patch(id, { name, phone, city, address });
  },
});

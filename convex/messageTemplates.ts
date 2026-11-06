import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireAdmin } from "./auth";

// The WhatsApp messages the admin has reworded. A message that isn't here uses
// its original wording (src/components/admin/messageTemplates.js).

const localeValidator = v.union(v.literal("ckb"), v.literal("ar"));
const MAX_BODY = 4000;

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("messageTemplates").collect();
    return rows.map(({ key, locale, body }) => ({ key, locale, body }));
  },
});

async function find(ctx: MutationCtx, key: string, locale: "ckb" | "ar") {
  return await ctx.db
    .query("messageTemplates")
    .withIndex("by_key_and_locale", (q) => q.eq("key", key).eq("locale", locale))
    .unique();
}

export const save = mutation({
  args: { key: v.string(), locale: localeValidator, body: v.string(), label: v.string() },
  handler: async (ctx, { key, locale, body, label }) => {
    const { user } = await requireAdmin(ctx);
    const text = body.trim();
    if (!text) throw new ConvexError("The message can't be empty");
    if (text.length > MAX_BODY) throw new ConvexError("The message is too long");
    const now = new Date().toISOString();
    const row = await find(ctx, key, locale);
    if (row) await ctx.db.patch(row._id, { body: text, updatedAt: now });
    else await ctx.db.insert("messageTemplates", { key, locale, body: text, updatedAt: now });
    await ctx.db.insert("adminLogs", {
      adminName: user!.name,
      action: "template_edited",
      productTitle: label.slice(0, 80),
      notes: locale === "ar" ? "Arabic" : "Kurdish",
      createdAt: now,
    });
    return null;
  },
});

// Back to the original wording.
export const reset = mutation({
  args: { key: v.string(), locale: localeValidator, label: v.string() },
  handler: async (ctx, { key, locale, label }) => {
    const { user } = await requireAdmin(ctx);
    const row = await find(ctx, key, locale);
    if (!row) return null;
    await ctx.db.delete(row._id);
    await ctx.db.insert("adminLogs", {
      adminName: user!.name,
      action: "template_reset",
      productTitle: label.slice(0, 80),
      notes: locale === "ar" ? "Arabic" : "Kurdish",
      createdAt: new Date().toISOString(),
    });
    return null;
  },
});

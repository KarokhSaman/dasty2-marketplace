import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import type { Category } from "./types";

// Old → current category names. Keys are free-form because legacy data may
// contain anything; values are pinned to the current `Category` union.
const CATEGORY_MAP: Record<string, Category> = {
  "Carrycot":       "Carry Cot",
  "Carrier":        "Carry Cot",
  "Carseat":        "Car Seats",
  "Electrics":      "Electronics & Monitors",
  "Fabric":         "Other",
  "Highchair":      "High Chairs",
  "Jolana":         "Bouncers & Swings",
  "Jumper":         "Bouncers & Swings",
  "Mastela":        "Bouncers & Swings",
  "Next2me":        "Bed",
  "Rawrawa":        "Bouncers & Swings",
  "Sisam":          "Other",
  "Shirdosh":       "Feeding & Nursing",
  "Stroller":       "Strollers & Travel",
  "Yary u sht":     "Toys & Play",
  "Other":          "Other",
  // Previous migration names → new names
  "Baby Carriers":  "Carry Cot",
  "Sleep & Bedtime":"Bed",
  // Removed category → Other
  "Clothing & Fabric": "Other",
};

// One-off Clerk → VerifySpeed data migration. RUN ONCE, and only against a
// transitional schema that still permits the legacy clerk fields (see
// docs/verifyspeed-auth-migration.md §3.8 / the runbook) — the final narrowed
// schema in convex/schema.ts must be deployed AFTER this runs.
//
// Effect (irreversible — back up users/products/notifications first):
//  1. Abort unless every admin/super_admin already has an E.164 phone.
//  2. Delete all role:"seller" users.
//  3. Delete all products whose sellerId !== "ADMIN" (+ their notifications).
//  4. Delete all notifications whose sellerId !== "ADMIN".
//  5. Strip legacy clerk fields from the kept admins.
// (Orphaned otpCodes rows, if any, are dropped by removing the table from the
//  schema — clear them from the dashboard if you want the storage back.)
export const migrateToVerifySpeed = internalMutation({
  args: {},
  returns: v.object({
    deletedSellers: v.number(),
    deletedProducts: v.number(),
    deletedNotifications: v.number(),
    keptAdmins: v.number(),
  }),
  handler: async (ctx) => {
    const admins = [
      ...(await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "admin")).collect()),
      ...(await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "super_admin")).collect()),
    ];

    // 1. Pre-check: no admin lockout.
    const missingPhone = admins
      .filter((a) => !a.phone || a.phone.trim() === "")
      .map((a) => a.email ?? (a._id as string));
    if (missingPhone.length > 0) {
      throw new Error(
        `Set an E.164 phone for these admins before migrating: ${missingPhone.join(", ")}`,
      );
    }

    // 2. Delete seller users.
    const sellers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "seller"))
      .collect();
    for (const s of sellers) await ctx.db.delete(s._id);

    // 3. Delete non-ADMIN products + their per-product notifications.
    const products = await ctx.db.query("products").collect();
    let deletedProducts = 0;
    let deletedNotifications = 0;
    for (const p of products) {
      if (p.sellerId === "ADMIN") continue;
      const productNotifs = await ctx.db
        .query("notifications")
        .withIndex("by_productId", (q) => q.eq("productId", p._id as string))
        .collect();
      for (const n of productNotifs) {
        await ctx.db.delete(n._id);
        deletedNotifications++;
      }
      await ctx.db.delete(p._id);
      deletedProducts++;
    }

    // 4. Delete remaining non-ADMIN notifications (seller-addressed).
    const notifs = await ctx.db.query("notifications").collect();
    for (const n of notifs) {
      if (n.sellerId === "ADMIN") continue;
      await ctx.db.delete(n._id);
      deletedNotifications++;
    }

    // 5. Strip legacy clerk fields from kept admins. `undefined` unsets a field.
    for (const a of admins) {
      const legacy = a as unknown as {
        clerkUserId?: string;
        clerkTokenIdentifier?: string;
      };
      if (legacy.clerkUserId !== undefined || legacy.clerkTokenIdentifier !== undefined) {
        await ctx.db.patch(a._id, {
          clerkUserId: undefined,
          clerkTokenIdentifier: undefined,
        } as Partial<Record<string, never>>);
      }
    }

    return {
      deletedSellers: sellers.length,
      deletedProducts,
      deletedNotifications,
      keptAdmins: admins.length,
    };
  },
});

export const migrateCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    let updated = 0;
    for (const p of products) {
      const newCat = CATEGORY_MAP[p.category];
      if (newCat && newCat !== p.category) {
        await ctx.db.patch(p._id, { category: newCat });
        updated++;
      }
    }
    return `Updated ${updated} of ${products.length} products.`;
  },
});

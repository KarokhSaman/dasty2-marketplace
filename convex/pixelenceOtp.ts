import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// Pixelence's /v1/otp/verify returns only { verified, status } — it never
// echoes the phone number. So when we send a WhatsApp code we remember which
// phone a requestId belongs to here, and verify looks it up. The client only
// ever sees the requestId (as the opaque verificationKey); it cannot pick which
// phone a verified code mints a session for.

// Remember requestId → phone after a successful send.
export const recordRequest = internalMutation({
  args: { requestId: v.string(), phone: v.string(), expiresAt: v.number() },
  returns: v.null(),
  handler: async (ctx, { requestId, phone, expiresAt }) => {
    await ctx.db.insert("pixelenceOtp", { requestId, phone, expiresAt });
    return null;
  },
});

// Find the phone for a requestId. A non-null result also tells verifyOtp this
// code was sent through Pixelence rather than VerifySpeed.
export const lookupRequest = internalQuery({
  args: { requestId: v.string() },
  returns: v.union(v.object({ phone: v.string() }), v.null()),
  handler: async (ctx, { requestId }) => {
    const row = await ctx.db
      .query("pixelenceOtp")
      .withIndex("by_request", (q) => q.eq("requestId", requestId))
      .unique();
    return row ? { phone: row.phone } : null;
  },
});

// Drop the mapping once a code has been verified so it can't be reused.
export const clearRequest = internalMutation({
  args: { requestId: v.string() },
  returns: v.null(),
  handler: async (ctx, { requestId }) => {
    const row = await ctx.db
      .query("pixelenceOtp")
      .withIndex("by_request", (q) => q.eq("requestId", requestId))
      .unique();
    if (row) await ctx.db.delete(row._id);
    return null;
  },
});

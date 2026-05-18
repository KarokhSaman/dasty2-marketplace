import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    // Remove any old OTPs for this email
    const old = await ctx.db
      .query("otpCodes")
      .filter((q) => q.eq(q.field("email"), email))
      .collect();
    for (const o of old) await ctx.db.delete(o._id);

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await ctx.db.insert("otpCodes", {
      email,
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
      verified: false,
    });
    return code;
  },
});

export const verify = mutation({
  args: { email: v.string(), code: v.string() },
  handler: async (ctx, { email, code }) => {
    const otp = await ctx.db
      .query("otpCodes")
      .filter((q) =>
        q.and(
          q.eq(q.field("email"), email),
          q.eq(q.field("code"), code),
          q.eq(q.field("verified"), false)
        )
      )
      .first();

    if (!otp) return { ok: false, reason: "invalid" };
    if (Date.now() > otp.expiresAt) {
      await ctx.db.delete(otp._id);
      return { ok: false, reason: "expired" };
    }

    await ctx.db.patch(otp._id, { verified: true });
    return { ok: true };
  },
});

export const isVerified = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const otp = await ctx.db
      .query("otpCodes")
      .filter((q) =>
        q.and(
          q.eq(q.field("email"), email),
          q.eq(q.field("verified"), true)
        )
      )
      .first();
    return !!otp && Date.now() < otp.expiresAt + 5 * 60 * 1000;
  },
});

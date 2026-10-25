import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// At most MAX_SENDS login codes per phone number within WINDOW_MS, across
// WhatsApp, Telegram and SMS. Checked on the server, so reloading the page or
// calling the API directly doesn't get around it.
export const MAX_SENDS = 3;
export const WINDOW_MS = 60 * 60 * 1000;

// Reserve a send for this number, or say how long until the next one is
// allowed. sendOtp calls this before asking VerifySpeed for a code.
export const takeSendSlot = internalMutation({
  args: { phone: v.string() },
  returns: v.union(
    v.object({ ok: v.literal(true), slotId: v.id("otpSends") }),
    v.object({ ok: v.literal(false), retryAfterMs: v.number() }),
  ),
  handler: async (ctx, { phone }) => {
    const now = Date.now();
    const since = now - WINDOW_MS;
    // by_phone ends with _creationTime, so this reads only this number's
    // recent sends, oldest first.
    const recent = await ctx.db
      .query("otpSends")
      .withIndex("by_phone", (q) => q.eq("phone", phone).gt("_creationTime", since))
      .take(MAX_SENDS);
    if (recent.length >= MAX_SENDS) {
      return { ok: false as const, retryAfterMs: Math.max(0, recent[0]._creationTime + WINDOW_MS - now) };
    }

    const slotId = await ctx.db.insert("otpSends", { phone });

    // Tidy this number's rows that have left the window.
    const old = await ctx.db
      .query("otpSends")
      .withIndex("by_phone", (q) => q.eq("phone", phone).lte("_creationTime", since))
      .take(20);
    for (const row of old) await ctx.db.delete(row._id);

    return { ok: true as const, slotId };
  },
});

// Give the send back when VerifySpeed couldn't send the code, so a failure on
// their side doesn't use up one of the seller's tries.
export const releaseSendSlot = internalMutation({
  args: { slotId: v.id("otpSends") },
  returns: v.null(),
  handler: async (ctx, { slotId }) => {
    if (await ctx.db.get(slotId)) await ctx.db.delete(slotId);
    return null;
  },
});

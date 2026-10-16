import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { issueSeq } from "./seq";

// One-off clean-up: gives a new code to every real product that shares its code
// with an older one. Sold-unit entries (soldFromId) share their listing's code on
// purpose, so they are never counted as duplicates and follow their listing.
// Run with dryRun first:
//   npx convex run fixSeq:renumberDuplicates '{"dryRun":true}'   (add --prod for production)
export const renumberDuplicates = internalMutation({
  args: { dryRun: v.boolean() },
  returns: v.array(
    v.object({
      title: v.string(),
      status: v.string(),
      dateAdded: v.string(),
      oldSeq: v.string(),
      newSeq: v.string(),
    }),
  ),
  handler: async (ctx, { dryRun }) => {
    const all = await ctx.db.query("products").collect();
    const real = all.filter((p) => !p.soldFromId);

    const bySeq = new Map<string, typeof real>();
    for (const p of real) {
      const list = bySeq.get(p.seq) ?? [];
      list.push(p);
      bySeq.set(p.seq, list);
    }

    const changes: { title: string; status: string; dateAdded: string; oldSeq: string; newSeq: string }[] = [];
    let preview = 0;
    for (const [seq, list] of [...bySeq.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      if (list.length < 2) continue;
      // The oldest product keeps the code; the others get new ones.
      const sorted = [...list].sort((a, b) => a._creationTime - b._creationTime);
      for (const p of sorted.slice(1)) {
        const newSeq = dryRun ? `(next free #${++preview})` : await issueSeq(ctx);
        changes.push({ title: p.title, status: p.status, dateAdded: p.dateAdded, oldSeq: seq, newSeq });
        if (dryRun) continue;
        await ctx.db.patch(p._id, { seq: newSeq });
        for (const unit of all) {
          if (unit.soldFromId === p._id) await ctx.db.patch(unit._id, { seq: newSeq });
        }
      }
    }
    return changes;
  },
});

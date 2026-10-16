import type { MutationCtx } from "./_generated/server";

// Next product code, e.g. "26-0088". Taken from a per-year counter that only
// ever goes up, so deleting products (or sold-unit entries sharing a code) can
// never make a code repeat. The first call of a year starts after the highest
// code already issued.
export async function issueSeq(ctx: MutationCtx): Promise<string> {
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = `${yy}-`;
  const name = `seq-${yy}`;
  const format = (n: number) => `${prefix}${String(n).padStart(4, "0")}`;

  const counter = await ctx.db
    .query("counters")
    .withIndex("by_name", (q) => q.eq("name", name))
    .unique();
  if (counter) {
    const value = counter.value + 1;
    await ctx.db.patch(counter._id, { value });
    return format(value);
  }

  const all = await ctx.db.query("products").collect();
  let highest = 0;
  for (const p of all) {
    if (!(p.seq ?? "").startsWith(prefix)) continue;
    const n = parseInt(p.seq.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > highest) highest = n;
  }
  const value = highest + 1;
  await ctx.db.insert("counters", { name, value });
  return format(value);
}

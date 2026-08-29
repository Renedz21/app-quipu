import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/**
 * Marks active cycles that have income but no allocation ledger lines
 * as needing review. Does NOT invent savings contributions or rewrite
 * envelope balances.
 */
export const markLegacyAllocationsForReview = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  returns: v.object({
    cyclesTouched: v.number(),
    dryRun: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const cycles = await ctx.db.query("financialCycles").collect();
    let cyclesTouched = 0;
    for (const cycle of cycles) {
      if (cycle.status !== "active") continue;
      const hasLines = await ctx.db
        .query("incomeAllocationLines")
        .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
        .first();
      if (hasLines) continue;
      const hasIncome = await ctx.db
        .query("incomeEvents")
        .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
        .first();
      if (!hasIncome) continue;
      cyclesTouched += 1;
      if (!dryRun) {
        await ctx.db.patch(cycle._id, {
          needsReview: true,
          unallocatedCents: cycle.unallocatedCents ?? 0,
        });
      }
    }
    return { cyclesTouched, dryRun };
  },
});

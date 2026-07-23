import { internalMutation } from "../_generated/server";

/**
 * One-shot backfill before P0-3 schema narrow.
 * Run once: `npx convex run migrations/backfillRequiredV25:backfillRequiredV25Fields`
 */
export const backfillRequiredV25Fields = internalMutation({
  args: {},
  handler: async (ctx) => {
    let profilesPatched = 0;
    let cyclesPatched = 0;
    let commitmentsPatched = 0;

    for (const profile of await ctx.db.query("profiles").collect()) {
      if (profile.incomeModel === undefined) {
        await ctx.db.patch(profile._id, { incomeModel: "fixed" });
        profilesPatched++;
      }
    }

    for (const cycle of await ctx.db.query("financialCycles").collect()) {
      if (cycle.totalIncomeReceived === undefined) {
        await ctx.db.patch(cycle._id, { totalIncomeReceived: 0 });
        cyclesPatched++;
      }
    }

    for (const commitment of await ctx.db.query("fixedCommitments").collect()) {
      if (commitment.dueDay === undefined) {
        await ctx.db.patch(commitment._id, { dueDay: 1 });
        commitmentsPatched++;
      }
    }

    return { profilesPatched, cyclesPatched, commitmentsPatched };
  },
});

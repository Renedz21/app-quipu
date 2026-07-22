import { internalMutation } from "../_generated/server";

const APP_TABLES = [
  "profiles",
  "financialCycles",
  "envelopes",
  "subEnvelopes",
  "fixedCommitments",
  "expenses",
  "coachInteractions",
  "streaks",
  "cycleHistory",
  "incomeEvents",
  "surplusContributions",
] as const;

export const resetAppTables = internalMutation({
  args: {},
  handler: async (ctx) => {
    const counts: Record<string, number> = {};

    for (const table of APP_TABLES) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
      counts[table] = docs.length;
    }

    return { deleted: counts };
  },
});

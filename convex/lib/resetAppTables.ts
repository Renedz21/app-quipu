import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { APP_DATA_TABLES } from "./appDataTables";

export const resetAppTables = internalMutation({
  args: {},
  returns: v.object({ deleted: v.record(v.string(), v.number()) }),
  handler: async (ctx) => {
    const counts: Record<string, number> = {};

    for (const table of APP_DATA_TABLES) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
      counts[table] = docs.length;
    }

    return { deleted: counts };
  },
});

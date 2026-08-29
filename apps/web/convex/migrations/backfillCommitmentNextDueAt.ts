import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { computeInitialNextDueAt } from "../lib/commitmentDueDate";

/** One-shot: set nextDueAt on legacy fixedCommitments from creation time + dueDay. */
export const backfillCommitmentNextDueAt = internalMutation({
  args: {},
  returns: v.object({ updated: v.number() }),
  handler: async (ctx) => {
    const commitments = await ctx.db.query("fixedCommitments").collect();
    let updated = 0;

    for (const commitment of commitments) {
      if (commitment.nextDueAt != null) continue;

      await ctx.db.patch(commitment._id, {
        nextDueAt: computeInitialNextDueAt(
          commitment.dueDay,
          commitment._creationTime,
        ),
      });
      updated += 1;
    }

    return { updated };
  },
});

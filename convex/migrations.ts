import { internalMutation } from "./_generated/server";
import {
  backfillCommitmentDueDay,
  backfillIncomeModel,
} from "./lib/migrations";

/**
 * Backfill v2.5 fields from v2.0 fields.
 *
 * Idempotent: safe to re-run. Existing v2.5 values are preserved.
 */
export const backfillProfilesV25 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    let updated = 0;

    for (const profile of profiles) {
      // Skip if already migrated to v2.5 (incomeModel is set).
      if (profile.incomeModel !== undefined) continue;

      const incomeModel = backfillIncomeModel({
        workerType: profile.workerType,
      });

      // If the backfilled model is variable, payFrequency and paydays must
      // be cleared. If fixed, keep them.
      const updates: {
        incomeModel: "fixed" | "variable";
        payFrequency?: undefined;
        paydays?: undefined;
      } = { incomeModel };

      if (incomeModel === "variable") {
        updates.payFrequency = undefined;
        updates.paydays = undefined;
      }

      await ctx.db.patch(profile._id, updates);
      updated++;
    }

    return { profilesUpdated: updated };
  },
});

export const backfillCommitmentsV25 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const commitments = await ctx.db.query("fixedCommitments").collect();
    let updated = 0;

    for (const commitment of commitments) {
      if (commitment.dueDay !== undefined) continue;

      const profile = await ctx.db.get(commitment.profileId);
      const paydays = profile?.paydays;

      const dueDay = backfillCommitmentDueDay({
        // Las filas v2.0 siempre tuvieron frequency required; la marca optional
        // del schema es para que el código nuevo pueda omitirla. En la práctica
        // el valor siempre existe en dev/prod al momento del backfill.
        frequency: commitment.frequency ?? "monthly",
        paydays: paydays ?? undefined,
      });

      await ctx.db.patch(commitment._id, { dueDay });
      updated++;
    }

    return { commitmentsUpdated: updated };
  },
});

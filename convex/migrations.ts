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

export const backfillCyclesV25 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cycles = await ctx.db.query("financialCycles").collect();
    let updated = 0;

    for (const cycle of cycles) {
      if (cycle.totalIncomeReceived !== undefined) continue;
      const total =
        cycle.baseIncomeReceived + cycle.extraordinaryIncomeReceived;
      await ctx.db.patch(cycle._id, { totalIncomeReceived: total });
      updated++;
    }

    return { cyclesUpdated: updated };
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
        frequency: commitment.frequency,
        paydays: paydays ?? undefined,
      });

      await ctx.db.patch(commitment._id, { dueDay });
      updated++;
    }

    return { commitmentsUpdated: updated };
  },
});

export const backfillIncomeEventsV25 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const adHoc = await ctx.db.query("adHocIncomes").collect();
    let created = 0;

    for (const income of adHoc) {
      if (income.migratedToIncomeEvents === true) continue;

      await ctx.db.insert("incomeEvents", {
        profileId: income.profileId,
        cycleId: income.cycleId,
        amount: income.amount,
        source: "other",
        description: income.description,
        occurredAt: income.timestamp,
        distributionApplied: income.split,
      });
      await ctx.db.patch(income._id, { migratedToIncomeEvents: true });
      created++;
    }

    return { incomeEventsCreated: created };
  },
});

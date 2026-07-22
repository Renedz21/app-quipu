import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { evaluateCycleCompliance } from "./budgetMath";
import {
  type CommitmentSlice,
  computeAllCommitmentCoverage,
  type IncomeEventSlice,
} from "./commitmentCoverage";
import { computeNextStreak } from "./gamificationMath";

export async function evaluateClosedCycle(
  ctx: MutationCtx,
  profileId: Id<"profiles">,
  cycleId: Id<"financialCycles">,
  now: number,
) {
  const cycle = await ctx.db.get(cycleId);
  if (!cycle) return;

  const existingHistory = await ctx.db
    .query("cycleHistory")
    .withIndex("by_profile_cycle", (q) =>
      q.eq("profileId", profileId).eq("cycleId", cycleId),
    )
    .unique();
  if (existingHistory) return;

  const streakRow = await ctx.db
    .query("streaks")
    .withIndex("by_profileId", (q) => q.eq("profileId", profileId))
    .unique();

  if (streakRow?.lastEvaluatedCycleId === cycleId) return;

  const envelopes = await ctx.db
    .query("envelopes")
    .withIndex("by_cycle_type", (q) => q.eq("cycleId", cycleId))
    .collect();

  const compliance = evaluateCycleCompliance(envelopes);
  const wantsEnvelope = envelopes.find((env) => env.type === "wants");
  const wantsWithinBudget = (wantsEnvelope?.remainingAmount ?? 0) >= 0;

  const [commitments, incomeEvents] = await Promise.all([
    ctx.db
      .query("fixedCommitments")
      .withIndex("by_profileId", (q) => q.eq("profileId", profileId))
      .collect(),
    ctx.db
      .query("incomeEvents")
      .withIndex("by_cycle", (q) => q.eq("cycleId", cycleId))
      .collect(),
  ]);

  const commitmentSlices: CommitmentSlice[] = commitments.map((commitment) => ({
    id: commitment._id,
    amount: commitment.amount,
    envelope: commitment.envelope,
    dueDay: commitment.dueDay,
  }));

  const incomeEventSlices: IncomeEventSlice[] = incomeEvents.map((event) => ({
    id: event._id,
    occurredAt: event.occurredAt,
    distributionApplied: event.distributionApplied,
  }));

  const coverageById = computeAllCommitmentCoverage({
    commitments: commitmentSlices,
    cycle: {
      startDate: cycle.startDate,
      endDate: cycle.endDate,
    },
    incomeEvents: incomeEventSlices,
    now,
    coverageBoost: cycle.coverageBoost ?? undefined,
    excludedCommitmentIds: (() => {
      const ids = new Set<Id<"fixedCommitments">>();
      for (const commitment of commitments) {
        if (commitment.postponedForCycleId === cycleId) {
          ids.add(commitment._id);
        }
      }
      return ids;
    })(),
  });

  const allCommitmentsCovered =
    commitmentSlices.length === 0
      ? true
      : commitmentSlices.every(
          (commitment) => coverageById.get(commitment.id)?.status === "covered",
        );

  await ctx.db.insert("cycleHistory", {
    profileId,
    cycleId,
    status: compliance,
    evaluatedAt: now,
    wantsWithinBudget,
    allCommitmentsCovered,
  });

  const currentStreak = streakRow?.currentStreak ?? 0;
  const longestStreak = streakRow?.longestStreak ?? 0;
  const next = computeNextStreak(currentStreak, longestStreak, compliance);

  if (streakRow) {
    await ctx.db.patch(streakRow._id, {
      currentStreak: next.currentStreak,
      longestStreak: next.longestStreak,
      lastEvaluatedCycleId: cycleId,
    });
  } else {
    await ctx.db.insert("streaks", {
      profileId,
      currentStreak: next.currentStreak,
      longestStreak: next.longestStreak,
      lastEvaluatedCycleId: cycleId,
    });
  }
}

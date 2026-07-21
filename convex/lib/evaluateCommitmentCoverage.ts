import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  computeAllCommitmentCoverage,
  type CommitmentSlice,
  type IncomeEventSlice,
} from "./commitmentCoverage";

export async function clearCommitmentCoverageForProfile(
  ctx: MutationCtx,
  profileId: Id<"profiles">,
) {
  const commitments = await ctx.db
    .query("fixedCommitments")
    .withIndex("by_profileId", (q) => q.eq("profileId", profileId))
    .collect();

  await Promise.all(
    commitments.map((commitment) =>
      ctx.db.patch(commitment._id, {
        coveredAt: undefined,
        coveredBy: undefined,
      }),
    ),
  );
}

export async function evaluateCommitmentCoverageForCycle(
  ctx: MutationCtx,
  profileId: Id<"profiles">,
  cycleId: Id<"financialCycles">,
  now: number,
) {
  const cycle = await ctx.db.get(cycleId);
  if (!cycle) return;

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
  });

  await Promise.all(
    commitments.map((commitment) => {
      const coverage = coverageById.get(commitment._id);
      if (!coverage) return Promise.resolve();

      if (coverage.status === "covered") {
        return ctx.db.patch(commitment._id, {
          coveredAt: commitment.coveredAt ?? now,
          coveredBy: coverage.fundingEvents.map(
            (funding) => funding.eventId as Id<"incomeEvents">,
          ),
        });
      }

      return ctx.db.patch(commitment._id, {
        coveredAt: undefined,
        coveredBy: undefined,
      });
    }),
  );
}

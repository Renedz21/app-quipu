import { assertNonNegativeCents } from "./moneyInvariant";

export type CycleCorrectionPlan = {
  reserveToCommitments: Array<{ commitmentId: string; amountCents: number }>;
  setEnvelopeRemaining: { needs: number; wants: number; savings: number };
  contributeToSavings: Array<{
    amountCents: number;
    kind: "objective" | "additional";
    subEnvelopeId?: string;
  }>;
  setUnallocatedCents: number;
  note?: string;
};

export type CycleCorrectionSnapshot = {
  needsRemaining: number;
  wantsRemaining: number;
  savingsRemaining: number;
  unallocatedCents: number;
  activeReservedCents: number;
};

export type InternalTransferDraft = {
  kind:
    | "cycle_correction"
    | "reservation_from_envelope"
    | "unallocated_to_envelope"
    | "unallocated_to_reservation"
    | "unallocated_to_savings"
    | "envelope_rebalance"
    | "savings_to_unallocated";
  amountCents: number;
  from: string;
  to: string;
};

/**
 * Liquid total that must be conserved by a correction (excluding Fondo which
 * may increase when user confirms contributions from liquid pots).
 */
export function computeLiquidTotal(snapshot: CycleCorrectionSnapshot): number {
  return (
    Math.max(0, snapshot.needsRemaining) +
    Math.max(0, snapshot.wantsRemaining) +
    Math.max(0, snapshot.savingsRemaining) +
    Math.max(0, snapshot.unallocatedCents) +
    Math.max(0, snapshot.activeReservedCents)
  );
}

export function buildCycleCorrectionTransfers(input: {
  before: CycleCorrectionSnapshot;
  plan: CycleCorrectionPlan;
}): {
  transfers: InternalTransferDraft[];
  after: CycleCorrectionSnapshot;
  contributionCents: number;
  conservedLiquidMinusContributions: boolean;
} {
  for (const key of ["needs", "wants", "savings"] as const) {
    assertNonNegativeCents(
      input.plan.setEnvelopeRemaining[key],
      `setEnvelopeRemaining.${key}`,
    );
  }
  assertNonNegativeCents(input.plan.setUnallocatedCents, "setUnallocatedCents");
  for (const row of input.plan.reserveToCommitments) {
    assertNonNegativeCents(row.amountCents, "reserveToCommitments.amountCents");
  }
  for (const row of input.plan.contributeToSavings) {
    assertNonNegativeCents(row.amountCents, "contributeToSavings.amountCents");
  }

  const newReserved = input.plan.reserveToCommitments.reduce(
    (sum, row) => sum + row.amountCents,
    0,
  );
  const contributionCents = input.plan.contributeToSavings.reduce(
    (sum, row) => sum + row.amountCents,
    0,
  );

  const after: CycleCorrectionSnapshot = {
    needsRemaining: input.plan.setEnvelopeRemaining.needs,
    wantsRemaining: input.plan.setEnvelopeRemaining.wants,
    savingsRemaining: input.plan.setEnvelopeRemaining.savings,
    unallocatedCents: input.plan.setUnallocatedCents,
    activeReservedCents: newReserved,
  };

  const beforeLiquid = computeLiquidTotal(input.before);
  const afterLiquid = computeLiquidTotal(after);
  const conservedLiquidMinusContributions =
    beforeLiquid === afterLiquid + contributionCents;

  const transfers: InternalTransferDraft[] = [];

  const pushDelta = (
    account: string,
    beforeCents: number,
    afterCents: number,
  ) => {
    const delta = afterCents - beforeCents;
    if (delta === 0) return;
    if (delta > 0) {
      transfers.push({
        kind: "cycle_correction",
        amountCents: delta,
        from: "correction:pool",
        to: account,
      });
    } else {
      transfers.push({
        kind: "cycle_correction",
        amountCents: -delta,
        from: account,
        to: "correction:pool",
      });
    }
  };

  pushDelta(
    "envelope:needs",
    input.before.needsRemaining,
    after.needsRemaining,
  );
  pushDelta(
    "envelope:wants",
    input.before.wantsRemaining,
    after.wantsRemaining,
  );
  pushDelta(
    "envelope:savings",
    input.before.savingsRemaining,
    after.savingsRemaining,
  );
  pushDelta(
    "unallocated",
    input.before.unallocatedCents,
    after.unallocatedCents,
  );
  pushDelta(
    "reservations",
    input.before.activeReservedCents,
    after.activeReservedCents,
  );

  if (contributionCents > 0) {
    transfers.push({
      kind: "unallocated_to_savings",
      amountCents: contributionCents,
      from: "correction:pool",
      to: "subEnvelope:contribution",
    });
  }

  return {
    transfers,
    after,
    contributionCents,
    conservedLiquidMinusContributions,
  };
}

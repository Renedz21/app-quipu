/**
 * Preview of bank-vs-Quipu liquidity gap for the correct-cycle form.
 * Mirrors convex/lib/cycleCorrection conservation identity:
 * beforeLiquid + reconciliation = afterLiquid + contributions.
 */
export function computeCycleCorrectReconciliation(input: {
  quipuLiquidCents: number;
  targetNeedsCents: number;
  targetWantsCents: number;
  targetSavingsCents: number;
  targetUnallocatedCents: number;
  targetReservedCents: number;
  contributeCents: number;
}): {
  declaredLiquidCents: number;
  reconciliationDeltaCents: number;
} {
  const afterLiquid =
    input.targetNeedsCents +
    input.targetWantsCents +
    input.targetSavingsCents +
    input.targetUnallocatedCents +
    input.targetReservedCents;
  const declaredLiquidCents = afterLiquid + input.contributeCents;
  return {
    declaredLiquidCents,
    reconciliationDeltaCents: declaredLiquidCents - input.quipuLiquidCents,
  };
}

import { describe, expect, it } from "vitest";
import { computeCycleCorrectReconciliation } from "../cycle-correct-reconciliation";

describe("computeCycleCorrectReconciliation", () => {
  it("computes the July bank gap without inventing income", () => {
    const result = computeCycleCorrectReconciliation({
      quipuLiquidCents: 37_398,
      targetNeedsCents: 594,
      targetWantsCents: 0,
      targetSavingsCents: 0,
      targetUnallocatedCents: 0,
      targetReservedCents: 200_000,
      contributeCents: 0,
    });
    expect(result.declaredLiquidCents).toBe(200_594);
    expect(result.reconciliationDeltaCents).toBe(163_196);
  });

  it("is zero when targets already match Quipu liquid", () => {
    const result = computeCycleCorrectReconciliation({
      quipuLiquidCents: 10_000,
      targetNeedsCents: 4_000,
      targetWantsCents: 1_000,
      targetSavingsCents: 0,
      targetUnallocatedCents: 0,
      targetReservedCents: 5_000,
      contributeCents: 0,
    });
    expect(result.reconciliationDeltaCents).toBe(0);
  });
});

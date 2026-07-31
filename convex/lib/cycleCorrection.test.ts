import { describe, expect, it } from "vitest";
import {
  buildCycleCorrectionTransfers,
  computeLiquidTotal,
} from "./cycleCorrection";

describe("cycleCorrection", () => {
  it("conserves liquid when redistributing without contributions", () => {
    const before = {
      needsRemaining: 200_000,
      wantsRemaining: 50_000,
      savingsRemaining: 99_080,
      unallocatedCents: 0,
      activeReservedCents: 0,
    };
    const result = buildCycleCorrectionTransfers({
      before,
      plan: {
        reserveToCommitments: [{ commitmentId: "debt", amountCents: 250_000 }],
        setEnvelopeRemaining: {
          needs: 5_000,
          wants: 5_000,
          savings: 0,
        },
        contributeToSavings: [],
        // 349_080 − 250_000 − 5_000 − 5_000 = 89_080
        setUnallocatedCents: 89_080,
      },
    });
    expect(computeLiquidTotal(before)).toBe(349_080);
    expect(computeLiquidTotal(result.after)).toBe(349_080);
    expect(result.conservedLiquidMinusContributions).toBe(true);
  });

  it("allows confirmed contributions to leave liquid into Fondo", () => {
    const before = {
      needsRemaining: 100_00,
      wantsRemaining: 0,
      savingsRemaining: 50_00,
      unallocatedCents: 0,
      activeReservedCents: 0,
    };
    const result = buildCycleCorrectionTransfers({
      before,
      plan: {
        reserveToCommitments: [],
        setEnvelopeRemaining: { needs: 50_00, wants: 0, savings: 0 },
        contributeToSavings: [{ amountCents: 100_00, kind: "objective" }],
        setUnallocatedCents: 0,
      },
    });
    expect(result.contributionCents).toBe(100_00);
    expect(result.conservedLiquidMinusContributions).toBe(true);
  });
});

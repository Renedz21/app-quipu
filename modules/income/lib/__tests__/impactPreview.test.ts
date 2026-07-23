import { describe, expect, it } from "vitest";
import {
  computeDailyAvailableCents,
  computeImpactPreview,
  computeIncomeDistribution,
  resolveCycleDaysForPreview,
} from "../impactPreview";

const WEIGHTS_50_30_20 = {
  allocationNeeds: 50,
  allocationWants: 30,
  allocationSavings: 20,
};

describe("computeIncomeDistribution", () => {
  it("distributes exactly the input amount", () => {
    const result = computeIncomeDistribution(90_000, WEIGHTS_50_30_20);
    expect(result.needs + result.wants + result.savings).toBe(90_000);
    expect(result).toEqual({ needs: 45_000, wants: 27_000, savings: 18_000 });
  });

  it("handles remainder cents with largest-remainder", () => {
    const result = computeIncomeDistribution(10_001, WEIGHTS_50_30_20);
    expect(result.needs + result.wants + result.savings).toBe(10_001);
  });
});

describe("computeImpactPreview", () => {
  it("returns null for zero amount", () => {
    expect(
      computeImpactPreview({
        amountCents: 0,
        weights: WEIGHTS_50_30_20,
        currentEnvelopes: { needs: 0, wants: 0, savings: 0 },
        daysRemaining: 15,
      }),
    ).toBeNull();
  });

  it("projects envelope deltas and daily available for new cycle", () => {
    const preview = computeImpactPreview({
      amountCents: 90_000,
      weights: WEIGHTS_50_30_20,
      currentEnvelopes: { needs: 0, wants: 0, savings: 0 },
      daysRemaining: 15,
    });

    expect(preview).not.toBeNull();
    expect(preview?.distribution).toEqual({
      needs: 45_000,
      wants: 27_000,
      savings: 18_000,
    });
    expect(preview?.projectedEnvelopes.wants).toBe(27_000);
    expect(preview?.projectedDailyCents).toBe(
      computeDailyAvailableCents(27_000, 15),
    );
    expect(preview?.currentDailyCents).toBe(0);
  });

  it("adds to existing envelope balances", () => {
    const preview = computeImpactPreview({
      amountCents: 10_000,
      weights: WEIGHTS_50_30_20,
      currentEnvelopes: { needs: 50_000, wants: 30_000, savings: 20_000 },
      daysRemaining: 10,
    });

    expect(preview?.projectedEnvelopes).toEqual({
      needs: 55_000,
      wants: 33_000,
      savings: 22_000,
    });
    expect(preview?.projectedDailyCents).toBe(
      computeDailyAvailableCents(33_000, 10),
    );
  });
});

describe("resolveCycleDaysForPreview", () => {
  it("uses 15 days for variable income model", () => {
    expect(
      resolveCycleDaysForPreview({
        incomeModel: "variable",
        payFrequency: null,
      }),
    ).toBe(15);
  });

  it("maps pay frequency for fixed profiles", () => {
    expect(
      resolveCycleDaysForPreview({
        incomeModel: "fixed",
        payFrequency: "monthly",
      }),
    ).toBe(30);
  });
});

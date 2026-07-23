import { describe, expect, it } from "vitest";
import {
  buildCycleSavingsContextLabel,
  computeCycleSavingsBreakdown,
  computeObjectiveAdditionalBarPercents,
  computeObjectiveProgressPercent,
  computeSavingsSetAsideCents,
  countsTowardSavingsObjective,
} from "./cycleSavingsBreakdown";

describe("countsTowardSavingsObjective", () => {
  it("treats absent policy as habitual objective", () => {
    expect(countsTowardSavingsObjective(undefined)).toBe(true);
  });

  it("treats profile_default as objective", () => {
    expect(countsTowardSavingsObjective("profile_default")).toBe(true);
  });

  it("excludes all_to_savings from objective", () => {
    expect(countsTowardSavingsObjective("all_to_savings")).toBe(false);
  });
});

describe("computeCycleSavingsBreakdown", () => {
  it("returns zeros with no inputs", () => {
    expect(
      computeCycleSavingsBreakdown({
        incomeEvents: [],
        surplusContributions: [],
      }),
    ).toEqual({
      savingsObjectiveCents: 0,
      savingsAdditionalCents: 0,
      savingsTotalCents: 0,
      objectiveBarPercent: 0,
      additionalBarPercent: 0,
      status: "on_track",
      savingsSetAsideCents: 0,
      objectiveProgressPercent: 0,
    });
  });

  it("sums habitual and profile_default savings into objective", () => {
    const result = computeCycleSavingsBreakdown({
      incomeEvents: [
        {
          distributionApplied: { needs: 400, wants: 240, savings: 160 },
        },
        {
          distributionApplied: { needs: 500, wants: 300, savings: 200 },
          distributionPolicy: "profile_default",
        },
      ],
      surplusContributions: [],
    });

    expect(result.savingsObjectiveCents).toBe(360);
    expect(result.savingsAdditionalCents).toBe(0);
    expect(result.savingsTotalCents).toBe(360);
    expect(result.status).toBe("on_track");
  });

  it("routes all_to_savings events and surplus moves to additional", () => {
    const result = computeCycleSavingsBreakdown({
      incomeEvents: [
        {
          incomeKind: "extraordinary",
          distributionApplied: { needs: 0, wants: 0, savings: 500_00 },
          distributionPolicy: "all_to_savings",
        },
        {
          distributionApplied: { needs: 400, wants: 240, savings: 160 },
          distributionPolicy: "profile_default",
        },
      ],
      surplusContributions: [{ amount: 18_567 }],
    });

    expect(result.savingsObjectiveCents).toBe(160);
    expect(result.savingsAdditionalCents).toBe(500_00 + 18_567);
    expect(result.savingsTotalCents).toBe(
      result.savingsObjectiveCents + result.savingsAdditionalCents,
    );
    expect(result.status).toBe("above_objective");
  });

  it("derives under-target progress from savings envelope set-aside", () => {
    const result = computeCycleSavingsBreakdown({
      incomeEvents: [
        {
          distributionApplied: {
            needs: 3_256_67,
            wants: 1_954_00,
            savings: 814_33,
          },
          distributionPolicy: "profile_default",
        },
      ],
      surplusContributions: [],
      savingsEnvelope: {
        allocatedAmount: 1_500_00,
        remainingAmount: 685_67,
      },
    });

    expect(result.savingsObjectiveCents).toBe(814_33);
    expect(result.savingsSetAsideCents).toBe(814_33);
    expect(result.objectiveProgressPercent).toBe(100);
    expect(result.status).toBe("on_track");
  });

  it("marks below_objective when set-aside is under objective", () => {
    const result = computeCycleSavingsBreakdown({
      incomeEvents: [
        {
          distributionApplied: {
            needs: 3_256_67,
            wants: 1_954_00,
            savings: 814_33,
          },
          distributionPolicy: "profile_default",
        },
      ],
      surplusContributions: [],
      savingsEnvelope: {
        allocatedAmount: 814_33,
        remainingAmount: 314_33,
      },
    });

    expect(result.savingsSetAsideCents).toBe(500_00);
    expect(result.objectiveProgressPercent).toBe(61);
    expect(result.status).toBe("below_objective");
  });
});

describe("computeObjectiveAdditionalBarPercents", () => {
  it("returns proportional bar segments", () => {
    expect(computeObjectiveAdditionalBarPercents(814_33, 150_000)).toEqual({
      objectiveBarPercent: (814_33 / 150_000) * 100,
      additionalBarPercent: 100 - (814_33 / 150_000) * 100,
    });
  });
});

describe("computeSavingsSetAsideCents", () => {
  it("never returns negative set-aside", () => {
    expect(
      computeSavingsSetAsideCents({
        allocatedAmount: 100,
        remainingAmount: 150,
      }),
    ).toBe(0);
  });
});

describe("computeObjectiveProgressPercent", () => {
  it("caps at 100", () => {
    expect(computeObjectiveProgressPercent(900, 814)).toBe(100);
  });

  it("returns 0 when objective is zero", () => {
    expect(computeObjectiveProgressPercent(500, 0)).toBe(0);
  });
});

describe("buildCycleSavingsContextLabel", () => {
  it("mentions sueldo + gratificación when both kinds exist", () => {
    const label = buildCycleSavingsContextLabel(Date.UTC(2026, 6, 1), [
      {
        incomeKind: "habitual",
        distributionApplied: { needs: 0, wants: 0, savings: 1 },
      },
      {
        incomeKind: "extraordinary",
        distributionApplied: { needs: 0, wants: 0, savings: 1 },
      },
    ]);
    expect(label).toContain("sueldo + gratificación");
  });
});

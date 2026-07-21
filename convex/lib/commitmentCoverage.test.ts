import { describe, expect, it } from "vitest";
import {
  computeAllCommitmentCoverage,
  computeCommitmentCoverage,
  mapCoverageStatusToDashboard,
  type CommitmentSlice,
  type CycleSlice,
  type IncomeEventSlice,
} from "./commitmentCoverage";

const CYCLE: CycleSlice = {
  startDate: Date.parse("2026-07-01T05:00:00-05:00"),
  endDate: Date.parse("2026-08-01T05:00:00-05:00"),
};

function commitment(
  overrides: Partial<CommitmentSlice> & Pick<CommitmentSlice, "id">,
): CommitmentSlice {
  return {
    amount: 100_000,
    envelope: "needs",
    dueDay: 15,
    ...overrides,
  };
}

function income(
  overrides: Partial<IncomeEventSlice> & Pick<IncomeEventSlice, "id">,
): IncomeEventSlice {
  return {
    occurredAt: Date.parse("2026-07-05T12:00:00-05:00"),
    distributionApplied: { needs: 50_000, wants: 30_000, savings: 20_000 },
    ...overrides,
  };
}

describe("computeCommitmentCoverage", () => {
  it("marks covered when income events fully fund the commitment", () => {
    const rent = commitment({ id: "rent", amount: 80_000, dueDay: 5 });
    const events = [
      income({
        id: "payroll",
        distributionApplied: { needs: 120_000, wants: 0, savings: 0 },
      }),
    ];

    const result = computeCommitmentCoverage({
      commitment: rent,
      commitments: [rent],
      cycle: CYCLE,
      incomeEvents: events,
      now: Date.parse("2026-07-03T12:00:00-05:00"),
    });

    expect(result).toEqual({
      covered: 80_000,
      remaining: 0,
      fundingEvents: [{ eventId: "payroll", amount: 80_000 }],
      status: "covered",
    });
  });

  it("marks partial when only part of the commitment is funded", () => {
    const rent = commitment({ id: "rent", amount: 120_000, dueDay: 10 });
    const events = [
      income({
        id: "payroll",
        distributionApplied: { needs: 50_000, wants: 0, savings: 0 },
      }),
    ];

    const result = computeCommitmentCoverage({
      commitment: rent,
      commitments: [rent],
      cycle: CYCLE,
      incomeEvents: events,
      now: Date.parse("2026-07-08T12:00:00-05:00"),
    });

    expect(result.status).toBe("partial");
    expect(result.covered).toBe(50_000);
    expect(result.remaining).toBe(70_000);
    expect(result.fundingEvents).toEqual([{ eventId: "payroll", amount: 50_000 }]);
  });

  it("marks not-started when no income funds the envelope", () => {
    const netflix = commitment({
      id: "netflix",
      amount: 45_00,
      envelope: "wants",
      dueDay: 18,
    });
    const events = [
      income({
        id: "payroll",
        distributionApplied: { needs: 100_000, wants: 0, savings: 0 },
      }),
    ];

    const result = computeCommitmentCoverage({
      commitment: netflix,
      commitments: [netflix],
      cycle: CYCLE,
      incomeEvents: events,
      now: Date.parse("2026-07-10T12:00:00-05:00"),
    });

    expect(result).toEqual({
      covered: 0,
      remaining: 45_00,
      fundingEvents: [],
      status: "not-started",
    });
  });

  it("marks overdue when due day passed and commitment is not fully covered", () => {
    const rent = commitment({ id: "rent", amount: 100_000, dueDay: 5 });
    const events = [
      income({
        id: "payroll",
        distributionApplied: { needs: 40_000, wants: 0, savings: 0 },
      }),
    ];

    const result = computeCommitmentCoverage({
      commitment: rent,
      commitments: [rent],
      cycle: CYCLE,
      incomeEvents: events,
      now: Date.parse("2026-07-10T12:00:00-05:00"),
    });

    expect(result.status).toBe("overdue");
    expect(result.remaining).toBe(60_000);
  });

  it("cascades earlier due commitments before later ones in the same envelope", () => {
    const rent = commitment({ id: "rent", amount: 80_000, dueDay: 5 });
    const utilities = commitment({
      id: "utilities",
      amount: 50_000,
      dueDay: 20,
    });
    const events = [
      income({
        id: "payroll",
        distributionApplied: { needs: 100_000, wants: 0, savings: 0 },
      }),
    ];

    const cascade = computeAllCommitmentCoverage({
      commitments: [utilities, rent],
      cycle: CYCLE,
      incomeEvents: events,
      now: Date.parse("2026-07-04T12:00:00-05:00"),
    });

    expect(cascade.get("rent")).toMatchObject({
      covered: 80_000,
      remaining: 0,
      status: "covered",
    });
    expect(cascade.get("utilities")).toMatchObject({
      covered: 20_000,
      remaining: 30_000,
      status: "partial",
    });
  });

  it("ignores income events outside the cycle window", () => {
    const rent = commitment({ id: "rent", amount: 50_000, dueDay: 8 });
    const events = [
      income({
        id: "old",
        occurredAt: Date.parse("2026-06-28T12:00:00-05:00"),
        distributionApplied: { needs: 100_000, wants: 0, savings: 0 },
      }),
    ];

    const result = computeCommitmentCoverage({
      commitment: rent,
      commitments: [rent],
      cycle: CYCLE,
      incomeEvents: events,
      now: Date.parse("2026-07-06T12:00:00-05:00"),
    });

    expect(result.status).toBe("not-started");
    expect(result.covered).toBe(0);
  });
});

describe("mapCoverageStatusToDashboard", () => {
  it("maps cascade statuses to dashboard coverage labels", () => {
    expect(mapCoverageStatusToDashboard("covered")).toBe("covered");
    expect(mapCoverageStatusToDashboard("partial")).toBe("partial");
    expect(mapCoverageStatusToDashboard("not-started")).toBe("uncovered");
    expect(mapCoverageStatusToDashboard("overdue")).toBe("uncovered");
  });
});

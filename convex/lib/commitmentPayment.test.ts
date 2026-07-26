import { describe, expect, it } from "vitest";
import {
  isCommitmentPaidForCycle,
  resolveCommitmentPaymentStatus,
} from "./commitmentPayment";

const CYCLE_A = "cycle_a" as never;
const CYCLE_B = "cycle_b" as never;

// 2026-08-15 12:00 Lima → day 15
const AUG_15_NOON = new Date("2026-08-15T17:00:00.000Z").getTime();
// 2026-08-20 12:00 Lima → day 20 (due day 18 passed)
const AUG_20_NOON = new Date("2026-08-20T17:00:00.000Z").getTime();

describe("isCommitmentPaidForCycle", () => {
  it("returns true when paidForCycleId matches active cycle", () => {
    expect(
      isCommitmentPaidForCycle({ paidAt: 1, paidForCycleId: CYCLE_A }, CYCLE_A),
    ).toBe(true);
  });

  it("returns false when paid in a previous cycle", () => {
    expect(
      isCommitmentPaidForCycle({ paidAt: 1, paidForCycleId: CYCLE_A }, CYCLE_B),
    ).toBe(false);
  });
});

describe("resolveCommitmentPaymentStatus", () => {
  it("returns paid when marked for the active cycle", () => {
    expect(
      resolveCommitmentPaymentStatus({
        paidAt: AUG_15_NOON,
        paidForCycleId: CYCLE_A,
        activeCycleId: CYCLE_A,
        dueDay: 30,
        now: AUG_15_NOON,
      }),
    ).toBe("paid");
  });

  it("returns pending before due day when not paid", () => {
    expect(
      resolveCommitmentPaymentStatus({
        activeCycleId: CYCLE_A,
        dueDay: 30,
        now: AUG_15_NOON,
      }),
    ).toBe("pending");
  });

  it("returns overdue after due day when not paid", () => {
    expect(
      resolveCommitmentPaymentStatus({
        activeCycleId: CYCLE_A,
        dueDay: 18,
        now: AUG_20_NOON,
      }),
    ).toBe("overdue");
  });

  it("returns paid even when due day passed", () => {
    expect(
      resolveCommitmentPaymentStatus({
        paidAt: AUG_20_NOON,
        paidForCycleId: CYCLE_A,
        activeCycleId: CYCLE_A,
        dueDay: 18,
        now: AUG_20_NOON,
      }),
    ).toBe("paid");
  });
});

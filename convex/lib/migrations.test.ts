import { describe, expect, it } from "vitest";
import { backfillCommitmentDueDay, backfillIncomeModel } from "./migrations";

describe("backfillIncomeModel", () => {
  it("maps workerType=dependent to incomeModel=fixed", () => {
    expect(backfillIncomeModel({ workerType: "dependent" })).toBe("fixed");
  });

  it("maps workerType=independent to incomeModel=variable", () => {
    expect(backfillIncomeModel({ workerType: "independent" })).toBe("variable");
  });

  it("defaults to variable when workerType is missing", () => {
    // Defensive: a row that somehow lost workerType. Better to be variable
    // (more permissive: user can change it in settings) than to fail.
    expect(backfillIncomeModel({})).toBe("variable");
  });
});

describe("backfillCommitmentDueDay", () => {
  it("maps monthly to day 1", () => {
    expect(backfillCommitmentDueDay({ frequency: "monthly" })).toBe(1);
  });

  it("uses paydays[0] for first_payday when paydays present", () => {
    expect(
      backfillCommitmentDueDay({
        frequency: "first_payday",
        paydays: [15, 30],
      }),
    ).toBe(15);
  });

  it("uses paydays[1] for second_payday when paydays present", () => {
    expect(
      backfillCommitmentDueDay({
        frequency: "second_payday",
        paydays: [15, 30],
      }),
    ).toBe(30);
  });

  it("uses paydays[0] for every_payday when paydays present (lossy)", () => {
    // The user had the commitment billed on both paydays. v2.5 can only
    // represent one day. We pick the first; the user can adjust in settings.
    expect(
      backfillCommitmentDueDay({
        frequency: "every_payday",
        paydays: [15, 30],
      }),
    ).toBe(15);
  });

  it("falls back to day 1 when paydays is missing for first/second/every", () => {
    expect(backfillCommitmentDueDay({ frequency: "first_payday" })).toBe(1);
    expect(backfillCommitmentDueDay({ frequency: "second_payday" })).toBe(1);
    expect(backfillCommitmentDueDay({ frequency: "every_payday" })).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import { computeAllocations, suggestRescueTransfer } from "./budgetMath";

describe("budgetMath smoke", () => {
  it("computeAllocations distributes exactly the input amount", () => {
    const result = computeAllocations(10000, {
      allocationNeeds: 50,
      allocationWants: 30,
      allocationSavings: 20,
    });
    const sum = result.needs + result.wants + result.savings;
    expect(sum).toBe(10000);
  });
});

describe("suggestRescueTransfer", () => {
  it("returns transfer 0 and projectedDeficit 0 when wants is non-negative", () => {
    const r = suggestRescueTransfer(5000, 1000);
    expect(r).toEqual({ transfer: 0, projectedDeficit: 0 });
  });

  it("suggests transferring the smaller of deficit and savings", () => {
    const r = suggestRescueTransfer(1000, -500);
    expect(r).toEqual({ transfer: 500, projectedDeficit: 500 });
  });

  it("caps transfer at available savings when deficit exceeds savings", () => {
    const r = suggestRescueTransfer(300, -1000);
    expect(r).toEqual({ transfer: 300, projectedDeficit: 1000 });
  });
});

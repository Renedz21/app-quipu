import { describe, expect, it } from "vitest";
import { computeAllocations } from "./budgetMath";

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

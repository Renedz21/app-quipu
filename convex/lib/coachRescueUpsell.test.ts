import { describe, expect, it } from "vitest";
import { isRescueUpsellAvailable } from "./coachRescueUpsell";

describe("isRescueUpsellAvailable", () => {
  it("returns false for premium users", () => {
    expect(
      isRescueUpsellAvailable({
        plan: "premium",
        coachRescueUpsellAt: 100,
      }),
    ).toBe(false);
  });

  it("returns false when upsell was never triggered", () => {
    expect(isRescueUpsellAvailable({ plan: "free" })).toBe(false);
  });

  it("returns true when triggered and not dismissed", () => {
    expect(
      isRescueUpsellAvailable({
        plan: "free",
        coachRescueUpsellAt: 100,
      }),
    ).toBe(true);
  });

  it("returns false when dismissed after trigger", () => {
    expect(
      isRescueUpsellAvailable({
        plan: "free",
        coachRescueUpsellAt: 100,
        coachRescueUpsellDismissedAt: 200,
      }),
    ).toBe(false);
  });

  it("returns true when re-triggered after dismiss", () => {
    expect(
      isRescueUpsellAvailable({
        plan: "free",
        coachRescueUpsellAt: 300,
        coachRescueUpsellDismissedAt: 200,
      }),
    ).toBe(true);
  });
});

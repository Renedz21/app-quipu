import { describe, expect, it } from "vitest";
import {
  decideAutoApplyToggle,
  optimisticAutoApplySettled,
  patchAutoApply,
} from "./autoApplyToggle";

describe("decideAutoApplyToggle", () => {
  it("opens paywall for free users", () => {
    expect(
      decideAutoApplyToggle({
        isPremium: false,
        pending: false,
        currentChecked: false,
        nextChecked: true,
      }),
    ).toBe("paywall");
  });

  it("skips while a toggle request is in flight", () => {
    expect(
      decideAutoApplyToggle({
        isPremium: true,
        pending: true,
        currentChecked: false,
        nextChecked: true,
      }),
    ).toBe("skip");
  });

  it("skips no-op clicks (idempotent)", () => {
    expect(
      decideAutoApplyToggle({
        isPremium: true,
        pending: false,
        currentChecked: true,
        nextChecked: true,
      }),
    ).toBe("skip");
  });

  it("mutates when premium and value changes", () => {
    expect(
      decideAutoApplyToggle({
        isPremium: true,
        pending: false,
        currentChecked: false,
        nextChecked: true,
      }),
    ).toBe("mutate");
  });
});

describe("patchAutoApply", () => {
  it("returns a new map with one key flipped", () => {
    const next = patchAutoApply(
      {
        cts: false,
        gratifications: false,
        corporate_bonus: false,
        profit_sharing: false,
        custom: false,
      },
      "cts",
      true,
    );
    expect(next.cts).toBe(true);
    expect(next.gratifications).toBe(false);
  });
});

describe("optimisticAutoApplySettled", () => {
  it("is true when server matches optimistic keys", () => {
    expect(
      optimisticAutoApplySettled(
        {
          cts: true,
          gratifications: false,
          corporate_bonus: false,
          profit_sharing: false,
          custom: false,
        },
        { cts: true },
      ),
    ).toBe(true);
  });

  it("is false while server lags", () => {
    expect(
      optimisticAutoApplySettled(
        {
          cts: false,
          gratifications: false,
          corporate_bonus: false,
          profit_sharing: false,
          custom: false,
        },
        { cts: true },
      ),
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildRenewalSummary,
  extractUserIdFromPolarCustomerMetadata,
  isPremiumPolarSubscription,
  resolvePlanTier,
} from "./billingSync";

const PREMIUM_ID = "prod_premium";
const copy = {
  freeBody: "Gratis",
  renewalPrefix: "Próxima renovación",
  renewalAutomatic: "Renovación automática",
  canceledUntil: "Cancelado · activo hasta",
};

describe("isPremiumPolarSubscription", () => {
  it("returns true for active premium product", () => {
    expect(
      isPremiumPolarSubscription(
        {
          id: "sub_1",
          customerId: "cus_1",
          productId: PREMIUM_ID,
          status: "active",
          currentPeriodEnd: "2026-08-01T00:00:00.000Z",
          cancelAtPeriodEnd: false,
        },
        PREMIUM_ID,
      ),
    ).toBe(true);
  });

  it("returns false when canceled", () => {
    expect(
      isPremiumPolarSubscription(
        {
          id: "sub_1",
          customerId: "cus_1",
          productId: PREMIUM_ID,
          status: "canceled",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        },
        PREMIUM_ID,
      ),
    ).toBe(false);
  });
});

describe("resolvePlanTier", () => {
  it("maps active subscription to premium", () => {
    expect(
      resolvePlanTier(
        {
          id: "sub_1",
          customerId: "cus_1",
          productId: PREMIUM_ID,
          status: "trialing",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          productKey: "premium",
        },
        PREMIUM_ID,
      ),
    ).toBe("premium");
  });

  it("defaults to free without subscription", () => {
    expect(resolvePlanTier(null, PREMIUM_ID)).toBe("free");
  });
});

describe("buildRenewalSummary", () => {
  it("uses cancel copy when cancel at period end", () => {
    const summary = buildRenewalSummary(
      {
        id: "sub_1",
        customerId: "cus_1",
        productId: PREMIUM_ID,
        status: "active",
        currentPeriodEnd: "2026-08-15T12:00:00.000Z",
        cancelAtPeriodEnd: true,
      },
      PREMIUM_ID,
      copy,
    );
    expect(summary).toContain("Cancelado");
    expect(summary).toContain("ago");
  });
});

describe("extractUserIdFromPolarCustomerMetadata", () => {
  it("reads userId from metadata", () => {
    expect(
      extractUserIdFromPolarCustomerMetadata({ userId: "user_abc" }, null),
    ).toBe("user_abc");
  });
});

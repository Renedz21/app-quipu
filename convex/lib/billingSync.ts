import type { Doc } from "../_generated/dataModel";

const LIMA_TIMEZONE = "America/Lima";

export type PlanTier = Doc<"profiles">["plan"];

export type PolarSubscriptionSnapshot = {
  id: string;
  customerId: string;
  productId: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  productKey?: string | null;
};

export type BillingOverview = {
  tier: PlanTier;
  subscriptionStatus: "free" | "active" | "canceled_at_period_end";
  renewalSummary: string | null;
  cancelAtPeriodEnd: boolean;
  checkoutAvailable: boolean;
  premiumProductId: string | null;
};

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export function isPremiumPolarSubscription(
  subscription: PolarSubscriptionSnapshot | null,
  premiumProductId: string,
): boolean {
  if (!subscription || !premiumProductId) return false;
  const matchesProduct =
    subscription.productId === premiumProductId ||
    subscription.productKey === "premium";
  if (!matchesProduct) return false;
  if (!ACTIVE_STATUSES.has(subscription.status)) return false;
  return true;
}

export function resolvePlanTier(
  subscription: PolarSubscriptionSnapshot | null,
  premiumProductId: string,
): PlanTier {
  return isPremiumPolarSubscription(subscription, premiumProductId)
    ? "premium"
    : "free";
}

function formatLimaShortDate(isoOrNull: string | null): string | null {
  if (!isoOrNull) return null;
  const ms = Date.parse(isoOrNull);
  if (Number.isNaN(ms)) return null;
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    timeZone: LIMA_TIMEZONE,
  }).format(ms);
}

export function buildRenewalSummary(
  subscription: PolarSubscriptionSnapshot | null,
  premiumProductId: string,
  copy: {
    freeBody: string;
    renewalPrefix: string;
    renewalAutomatic: string;
    canceledUntil: string;
  },
): string | null {
  if (!isPremiumPolarSubscription(subscription, premiumProductId)) {
    return copy.freeBody;
  }
  const endLabel = formatLimaShortDate(subscription?.currentPeriodEnd ?? null);
  if (subscription?.cancelAtPeriodEnd && endLabel) {
    return `${copy.canceledUntil} ${endLabel}`;
  }
  if (endLabel) {
    return `${copy.renewalPrefix} · ${endLabel}`;
  }
  return copy.renewalAutomatic;
}

export function buildBillingOverview(
  subscription: PolarSubscriptionSnapshot | null,
  premiumProductId: string,
  copy: {
    freeBody: string;
    renewalPrefix: string;
    renewalAutomatic: string;
    canceledUntil: string;
  },
): BillingOverview {
  const tier = resolvePlanTier(subscription, premiumProductId);
  const isPremium = tier === "premium";
  const cancelAtPeriodEnd = Boolean(
    isPremium && subscription?.cancelAtPeriodEnd,
  );

  return {
    tier,
    subscriptionStatus: !isPremium
      ? "free"
      : cancelAtPeriodEnd
        ? "canceled_at_period_end"
        : "active",
    renewalSummary: buildRenewalSummary(subscription, premiumProductId, copy),
    cancelAtPeriodEnd,
    checkoutAvailable: premiumProductId.length > 0,
    premiumProductId: premiumProductId || null,
  };
}

export function extractUserIdFromPolarCustomerMetadata(
  metadata: Record<string, unknown> | undefined,
  externalId?: string | null,
): string | null {
  const userId = metadata?.userId;
  if (typeof userId === "string" && userId.length > 0) return userId;
  if (typeof externalId === "string" && externalId.length > 0)
    return externalId;
  return null;
}

export function polarSubscriptionFromWebhook(data: {
  id: string;
  customerId: string;
  productId: string;
  status: string;
  currentPeriodEnd: Date | string | null;
  cancelAtPeriodEnd: boolean;
}): PolarSubscriptionSnapshot {
  const currentPeriodEnd =
    data.currentPeriodEnd instanceof Date
      ? data.currentPeriodEnd.toISOString()
      : data.currentPeriodEnd;
  return {
    id: data.id,
    customerId: data.customerId,
    productId: data.productId,
    status: data.status,
    currentPeriodEnd,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd,
  };
}

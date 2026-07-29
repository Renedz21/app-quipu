import type { Doc } from "@/convex/_generated/dataModel";
import { MODEL_DISPLAY_LABELS } from "@/modules/onboarding/constants";
import {
  SETTINGS_PLAN_FREE_BODY,
  SETTINGS_PLAN_PLUS_PRICE,
  SETTINGS_PLAN_PLUS_PRICE_HINT,
  SETTINGS_PLAN_RENEWAL_AUTOMATIC,
} from "../constants";
import type { SettingsOverviewQueryResult } from "../queries";
import type { SettingsOverview, SettingsSubscriptionStatus } from "../types";

export type ConvexSettingsOverview = NonNullable<SettingsOverviewQueryResult>;

function mapSubscriptionStatus(
  status: NonNullable<ConvexSettingsOverview["billing"]>["subscriptionStatus"],
): SettingsSubscriptionStatus {
  if (status === "canceled_at_period_end") return "canceled_at_period_end";
  if (status === "active") return "active";
  return "free";
}

export function mapConvexSettingsOverview(
  data: ConvexSettingsOverview,
): SettingsOverview {
  const tier = data.account.plan.tier;
  const isPremium = tier === "premium";
  const billing = data.billing;

  return {
    profile: {
      name: data.account.name,
      email: data.account.email,
      country: data.account.country,
      incomeModelLabel: data.account.incomeModel.label,
      tags: data.account.tags,
      plan: tier,
    },
    subscription: {
      plan: tier,
      status: billing
        ? mapSubscriptionStatus(billing.subscriptionStatus)
        : isPremium
          ? "active"
          : "free",
      priceDisplay: data.account.plan.priceCopy ?? null,
      renewalSummary:
        billing?.renewalSummary ??
        (isPremium ? SETTINGS_PLAN_RENEWAL_AUTOMATIC : SETTINGS_PLAN_FREE_BODY),
      paymentMethodSummary: null,
      checkoutAvailable: billing?.checkoutAvailable ?? false,
      premiumProductId: billing?.premiumProductId ?? null,
    },
    passkeys: data.security.passkeys.map((pk) => ({
      id: pk.id,
      label: pk.name ?? "Passkey",
      usageSummary: pk.deviceType,
    })),
    sessionsApiReady: data.security.sessions?.apiReady ?? false,
    activeSessionCount: data.security.sessions?.count ?? null,
  };
}

/**
 * Fallback when Convex overview is unavailable (tests / offline).
 */
export function buildSettingsOverviewFromProfile(
  profile: Doc<"profiles">,
  account?: { email?: string | null },
): SettingsOverview {
  const tags: string[] = [];
  if (profile.variableIncomeSources?.length) {
    tags.push(...profile.variableIncomeSources.slice(0, 2));
  }
  tags.push(
    `Perfil ${MODEL_DISPLAY_LABELS[profile.incomeModel] ?? profile.incomeModel}`,
  );

  const isPremium = profile.plan === "premium";

  return {
    profile: {
      name: profile.name,
      email: account?.email ?? null,
      country: profile.country,
      incomeModelLabel:
        MODEL_DISPLAY_LABELS[profile.incomeModel] ?? profile.incomeModel,
      tags,
      plan: profile.plan,
    },
    subscription: {
      plan: profile.plan,
      status: isPremium ? "active" : "free",
      priceDisplay: isPremium
        ? SETTINGS_PLAN_PLUS_PRICE
        : SETTINGS_PLAN_PLUS_PRICE_HINT,
      renewalSummary: isPremium
        ? SETTINGS_PLAN_RENEWAL_AUTOMATIC
        : SETTINGS_PLAN_FREE_BODY,
      paymentMethodSummary: null,
      checkoutAvailable: false,
      premiumProductId: null,
    },
    passkeys: [],
    sessionsApiReady: false,
    activeSessionCount: null,
  };
}

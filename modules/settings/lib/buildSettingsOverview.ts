import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { MODEL_DISPLAY_LABELS } from "@/modules/onboarding/constants";
import {
  SETTINGS_PLAN_FREE_BODY,
  SETTINGS_PLAN_PLUS_PRICE,
  SETTINGS_PLAN_RENEWAL_STUB,
} from "../constants";
import type { SettingsOverview } from "../types";

export type ConvexSettingsOverview = NonNullable<
  FunctionReturnType<typeof api.settings.getSettingsOverview>
>;

export function mapConvexSettingsOverview(
  data: ConvexSettingsOverview,
): SettingsOverview {
  const tier = data.account.plan.tier;
  const isPremium = tier === "premium";

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
      status: isPremium ? "active" : "free",
      priceDisplay: data.account.plan.priceCopy ?? null,
      renewalSummary: isPremium
        ? SETTINGS_PLAN_RENEWAL_STUB
        : SETTINGS_PLAN_FREE_BODY,
      paymentMethodSummary: null,
    },
    passkeys: data.security.passkeys.map((pk) => ({
      id: pk.id,
      label: pk.name ?? "Passkey",
      usageSummary: pk.deviceType,
    })),
    sessionsApiReady: false,
    activeSessionCount: null,
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
      priceDisplay: isPremium ? SETTINGS_PLAN_PLUS_PRICE : null,
      renewalSummary: isPremium
        ? SETTINGS_PLAN_RENEWAL_STUB
        : SETTINGS_PLAN_FREE_BODY,
      paymentMethodSummary: null,
    },
    passkeys: [],
    sessionsApiReady: false,
    activeSessionCount: null,
  };
}

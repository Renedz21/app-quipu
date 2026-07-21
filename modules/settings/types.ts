import type { Doc } from "@/convex/_generated/dataModel";

/** Shape expected from `api.settings.getSettingsOverview` (backend sibling). */
export type SettingsOverview = {
  profile: SettingsProfileOverview;
  subscription: SettingsSubscriptionOverview;
  passkeys: SettingsPasskeyOverview[];
  /** When false, session management actions stay disabled with honest copy. */
  sessionsApiReady: boolean;
  activeSessionCount?: number | null;
};

export type SettingsProfileOverview = {
  name: string;
  email: string | null;
  country: string;
  incomeModelLabel: string;
  tags: string[];
  plan: Doc<"profiles">["plan"];
};

export type SettingsSubscriptionOverview = {
  plan: Doc<"profiles">["plan"];
  status: "active" | "free";
  priceDisplay: string | null;
  renewalSummary: string | null;
  paymentMethodSummary: string | null;
};

export type SettingsPasskeyOverview = {
  id: string;
  label: string;
  usageSummary: string;
};

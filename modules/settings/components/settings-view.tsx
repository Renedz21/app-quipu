"use client";

import { useQuery } from "convex/react";
import { authClient } from "@/auth/auth-client";
import { api } from "@/convex/_generated/api";
import { PLAN_LABELS } from "@/modules/dashboard/constants";
import { getInitial } from "@/modules/dashboard/lib/dashboard-math";
import { buttonVariants } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import {
  SETTINGS_ERROR_BODY,
  SETTINGS_ERROR_RETRY,
  SETTINGS_ERROR_TITLE,
  SETTINGS_MOBILE_ACCOUNT_LABEL,
  SETTINGS_PAGE_SUBTITLE,
  SETTINGS_PAGE_TITLE,
  SETTINGS_PLAN_ACTIVE_BADGE,
  SETTINGS_PLAN_LABEL,
  SETTINGS_PLAN_PLUS_PRICE,
  SETTINGS_PROFILE_LABEL,
  SETTINGS_SECURITY_LABEL,
} from "../constants";
import { mapConvexSettingsOverview } from "../lib/buildSettingsOverview";
import { SettingsCommitmentsSection } from "./settings-commitments-section";
import { SettingsPlanCard } from "./settings-plan-card";
import { SettingsProfileCard } from "./settings-profile-card";
import { SettingsSecurityCard } from "./settings-security-card";
import { SettingsSignOutItem } from "./settings-sign-out-item";
import { SettingsSystemSection } from "./settings-system-section";

function SettingsViewSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-2 h-4 w-64" />
      <div className="mt-6 flex flex-col gap-3.5 md:flex-row">
        <Skeleton className="h-64 flex-1 rounded-2xl" />
        <Skeleton className="h-64 flex-1 rounded-2xl" />
      </div>
    </div>
  );
}

function MobileAccountSummary({
  name,
  plan,
}: {
  name: string;
  plan: "free" | "premium";
}) {
  const planLine =
    plan === "premium"
      ? `${PLAN_LABELS.premium} · ${SETTINGS_PLAN_PLUS_PRICE}`
      : PLAN_LABELS.free;

  return (
    <div className="mb-3 flex items-center gap-3 md:hidden">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-qp-tint font-serif text-[21px] text-qp-deep">
        {getInitial(name)}
      </span>
      <div className="min-w-0">
        <div className="truncate text-base font-semibold text-ink">{name}</div>
        <div className="truncate text-xs text-mute-subtle">{planLine}</div>
      </div>
    </div>
  );
}

function MobileAccountList({
  passkeyCount,
  isPremium,
}: {
  passkeyCount: number;
  isPremium: boolean;
}) {
  return (
    <div className="mb-2.5 rounded-[14px] border border-line bg-card px-4 py-0.5 md:hidden">
      <div className="flex items-center gap-2 border-b border-line-soft py-2.5">
        <span className="flex-1 text-[13.5px] text-ink">{SETTINGS_PROFILE_LABEL}</span>
        <span className="text-faint">→</span>
      </div>
      <div className="flex items-center gap-2 border-b border-line-soft py-2.5">
        <span className="flex-1 text-[13.5px] text-ink">{SETTINGS_PLAN_LABEL}</span>
        {isPremium ? (
          <span className="rounded-full bg-qp-soft px-2 py-0.5 text-[11px] font-semibold text-qp-deep">
            {SETTINGS_PLAN_ACTIVE_BADGE}
          </span>
        ) : null}
        <span className="text-faint">→</span>
      </div>
      <div className="flex items-center gap-2 py-2.5">
        <span className="flex-1 text-[13.5px] text-ink">
          {SETTINGS_SECURITY_LABEL}
        </span>
        {passkeyCount > 0 ? (
          <span className="text-[11px] text-faint">{passkeyCount}</span>
        ) : null}
        <span className="text-faint">→</span>
      </div>
    </div>
  );
}

export function SettingsView() {
  const settingsData = useQuery(api.settings.getSettingsOverview, {});
  const profile = useQuery(api.profiles.getMyProfile, {});

  const passkeysQuery = authClient.useListPasskeys();
  const passkeyCount = passkeysQuery.data?.length ?? 0;

  if (settingsData === undefined || profile === undefined) {
    return <SettingsViewSkeleton />;
  }

  if (settingsData === null || profile === null) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <section className="rounded-[14px] border border-danger-line bg-danger-bg p-5 md:p-6">
          <h2 className="text-base font-semibold text-danger-ink">
            {SETTINGS_ERROR_TITLE}
          </h2>
          <p className="mt-2 text-sm text-danger-text">{SETTINGS_ERROR_BODY}</p>
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "mt-4 border-danger-line text-danger-ink hover:bg-danger-banner",
            )}
            onClick={() => window.location.reload()}
          >
            {SETTINGS_ERROR_RETRY}
          </button>
        </section>
      </div>
    );
  }

  const overview = mapConvexSettingsOverview(settingsData);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <header className="mb-5 md:mb-6">
        <h1 className="font-serif text-[23px] font-medium text-ink md:text-[27px]">
          {SETTINGS_PAGE_TITLE}
        </h1>
        <p className="mt-1 text-[12.5px] text-mute-subtle md:text-[13.5px]">
          {SETTINGS_PAGE_SUBTITLE}
        </p>
      </header>

      <MobileAccountSummary
        name={overview.profile.name}
        plan={overview.profile.plan}
      />

      <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-faint md:hidden">
        {SETTINGS_MOBILE_ACCOUNT_LABEL}
      </p>

      <MobileAccountList
        passkeyCount={passkeyCount}
        isPremium={overview.profile.plan === "premium"}
      />

      <div className="flex flex-col gap-3.5 md:flex-row md:gap-3.5">
        <div className="flex flex-1 flex-col gap-3.5">
          <SettingsProfileCard profile={overview.profile} />
          <SettingsPlanCard subscription={overview.subscription} />
        </div>
        <div className="flex-1">
          <SettingsSecurityCard sessionsApiReady={overview.sessionsApiReady} />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-3.5">
        <SettingsSystemSection className="flex-1" />
        <SettingsCommitmentsSection className="w-full lg:max-w-md" />
      </div>

      <div className="mt-3 md:mt-4">
        <SettingsSignOutItem />
      </div>
    </div>
  );
}

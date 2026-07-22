"use client";

import { authClient } from "@/auth/auth-client";
import { getInitial } from "@/modules/dashboard/lib/dashboard-math";
import { buttonVariants } from "@/shared/components/ui/button";
import { ListRowChevron } from "@/shared/components/ui/list-row-chevron";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { PLAN_LABELS } from "@/shared/constants/plan";
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
  SETTINGS_SYSTEM_HEADING,
} from "../constants";
import { mapConvexSettingsOverview } from "../lib/buildSettingsOverview";
import { useSettingsOverview } from "../queries";
import { SettingsCommitmentsSection } from "./settings-commitments-section";
import { SettingsExtraordinarySection } from "./settings-extraordinary-section";
import { SettingsPlanCard } from "./settings-plan-card";
import { SettingsProfileCard } from "./settings-profile-card";
import { SettingsSecurityCard } from "./settings-security-card";
import { SettingsSignOutItem } from "./settings-sign-out-item";
import { SettingsSystemSection } from "./settings-system-section";

/** Canon bloque 9 "Cargando": perfil + plan a la izquierda, seguridad
 *  a la derecha. */
function SettingsViewSkeleton() {
  return (
    <div
      role="status"
      aria-label="Abriendo ajustes"
      className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8"
    >
      <Skeleton className="h-[30px] w-[150px] rounded-lg" />
      <Skeleton
        variant="line"
        className="mt-2 h-[13px] w-[280px] max-w-full rounded-[5px]"
      />
      <div className="mt-6 flex flex-col gap-3.5 md:flex-row">
        <div className="flex flex-1 flex-col gap-3.5">
          <Skeleton className="h-[150px] rounded-2xl" />
          <Skeleton className="h-[150px] rounded-2xl [animation-delay:150ms]" />
        </div>
        <Skeleton className="h-[230px] flex-1 rounded-2xl [animation-delay:300ms] md:self-start" />
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
        <span className="flex-1 text-[13.5px] text-ink">
          {SETTINGS_PROFILE_LABEL}
        </span>
        <ListRowChevron />
      </div>
      <div className="flex items-center gap-2 border-b border-line-soft py-2.5">
        <span className="flex-1 text-[13.5px] text-ink">
          {SETTINGS_PLAN_LABEL}
        </span>
        {isPremium ? (
          <span className="rounded-full bg-qp-soft px-2 py-0.5 text-[11px] font-semibold text-qp-deep">
            {SETTINGS_PLAN_ACTIVE_BADGE}
          </span>
        ) : null}
        <ListRowChevron />
      </div>
      <div className="flex items-center gap-2 py-2.5">
        <span className="flex-1 text-[13.5px] text-ink">
          {SETTINGS_SECURITY_LABEL}
        </span>
        {passkeyCount > 0 ? (
          <span className="text-[11px] text-faint">{passkeyCount}</span>
        ) : null}
        <ListRowChevron />
      </div>
    </div>
  );
}

export function SettingsView() {
  const settingsData = useSettingsOverview();

  const passkeysQuery = authClient.useListPasskeys();
  const passkeyCount = passkeysQuery.data?.length ?? 0;

  if (settingsData === undefined) {
    return <SettingsViewSkeleton />;
  }

  if (settingsData === null) {
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

      <section className="mt-6">
        <h2 className="mb-[22px] hidden font-serif text-2xl font-medium text-ink md:block">
          {SETTINGS_SYSTEM_HEADING}
        </h2>
        <div className="flex flex-col gap-3.5 md:flex-row md:items-stretch">
          <div className="flex min-w-0 flex-col gap-3.5 md:flex-[1.1]">
            <SettingsSystemSection />
            <SettingsExtraordinarySection />
          </div>
          <SettingsCommitmentsSection className="flex min-w-0 flex-col md:flex-1" />
        </div>
      </section>

      <div className="mt-6 md:mt-8">
        <SettingsSignOutItem />
      </div>
    </div>
  );
}

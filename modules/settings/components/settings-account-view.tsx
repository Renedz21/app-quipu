"use client";

import { useMutation } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { BackLink } from "@/shared/components/ui/back-link";
import { buttonVariants } from "@/shared/components/ui/button-variants";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import {
  SETTINGS_BACK_LINK,
  SETTINGS_CHECKOUT_SUCCESS,
  SETTINGS_ERROR_BODY,
  SETTINGS_ERROR_RETRY,
  SETTINGS_ERROR_TITLE,
  SETTINGS_MOBILE_ACCOUNT_LABEL,
  SETTINGS_PAGE_SUBTITLE,
} from "../constants";
import { mapConvexSettingsOverview } from "../lib/buildSettingsOverview";
import { useSettingsOverview } from "../queries";
import { SettingsAccountActions } from "./settings-account-actions";
import { SettingsPlanCard } from "./settings-plan-card";
import { SettingsProfileCard } from "./settings-profile-card";
import { SettingsSecurityCard } from "./settings-security-card";

export function SettingsAccountViewSkeleton() {
  return (
    <div
      role="status"
      aria-label="Abriendo cuenta"
      className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8"
    >
      <Skeleton className="h-4 w-20 rounded" />
      <Skeleton className="mt-4 h-[30px] w-[150px] rounded-lg" />
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

export function SettingsAccountView() {
  const settingsData = useSettingsOverview();
  const searchParams = useSearchParams();
  const checkoutSuccess = searchParams.get("checkout") === "success";
  const [showCheckoutBanner] = useState(checkoutSuccess);
  const reconcileMyPlan = useMutation(api.billing.reconcileMyPlan);

  const shouldReconcileCheckout =
    checkoutSuccess && settingsData !== undefined && settingsData !== null;

  useEffect(() => {
    if (!shouldReconcileCheckout) return;
    void reconcileMyPlan({});
    window.history.replaceState(null, "", `${window.location.pathname}#plan`);
  }, [shouldReconcileCheckout, reconcileMyPlan]);

  if (settingsData === undefined) {
    return <SettingsAccountViewSkeleton />;
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
      <BackLink
        href="/settings"
        className="mb-3 text-[12.5px] text-mute hover:text-ink md:hidden"
      >
        {SETTINGS_BACK_LINK}
      </BackLink>

      <header className="mb-5 md:mb-6">
        <h1 className="font-serif text-[23px] font-medium text-ink md:text-[27px]">
          {SETTINGS_MOBILE_ACCOUNT_LABEL}
        </h1>
        <p className="mt-1 max-w-full text-[12.5px] text-mute-subtle md:text-[13.5px]">
          {SETTINGS_PAGE_SUBTITLE}
        </p>
      </header>

      <div className="flex min-w-0 flex-col gap-3.5 md:flex-row md:gap-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <SettingsProfileCard id="perfil" profile={overview.profile} />
          <div id="plan" className="min-w-0 scroll-mt-6">
            <SettingsPlanCard subscription={overview.subscription} />
            {showCheckoutBanner ? (
              <p
                className="mt-2 text-[12.5px] leading-snug text-mute-subtle"
                role="status"
              >
                {SETTINGS_CHECKOUT_SUCCESS}
              </p>
            ) : null}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <SettingsSecurityCard
            id="seguridad"
            sessionsApiReady={overview.sessionsApiReady}
            activeSessionCount={overview.activeSessionCount}
          />
        </div>
      </div>

      <SettingsAccountActions />
    </div>
  );
}

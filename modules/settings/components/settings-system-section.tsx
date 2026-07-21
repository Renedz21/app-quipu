"use client";

import Link from "next/link";
import { toast } from "sonner";
import { fromConvexError } from "@/core/errors";
import { useMyProfile } from "@/modules/auth/hooks/use-my-profile";
import { useUpdateNotificationPreferences } from "../actions";
import { AllocationBar } from "@/modules/onboarding/components/allocation-bar";
import { buttonVariants } from "@/shared/components/ui/button";
import { ListRowChevron } from "@/shared/components/ui/list-row-chevron";
import { cn } from "@/shared/lib/utils";
import {
  SETTINGS_ADJUST_ALLOCATIONS,
  SETTINGS_CHANGE_CYCLE,
  SETTINGS_CURRENCY_LABEL,
  SETTINGS_CURRENCY_VALUE,
  SETTINGS_CYCLE_ALERTS_LABEL,
  SETTINGS_CYCLE_LABEL,
  SETTINGS_CYCLE_PROFILE,
  SETTINGS_CYCLE_START,
  SETTINGS_CYCLE_TYPE,
  SETTINGS_DAILY_SUMMARY_LABEL,
  SETTINGS_LANGUAGE_LABEL,
  SETTINGS_LANGUAGE_VALUE,
  SETTINGS_PERCENTAGES_LABEL,
  SETTINGS_PERCENTAGES_SUM_OK,
  SETTINGS_PREFERENCES_LABEL,
  SETTINGS_SYSTEM_HEADING,
  SETTINGS_SYSTEM_LABEL,
} from "../constants";
import {
  formatCycleStart,
  formatCycleType,
  formatIncomeProfileLabel,
} from "../lib/cycle-display";
import { SettingsToggle } from "./settings-toggle";

function envelopeDotClass(type: "needs" | "wants" | "savings") {
  switch (type) {
    case "needs":
      return "bg-needs";
    case "wants":
      return "bg-clay";
    case "savings":
      return "bg-moss";
  }
}

export function SettingsSystemSection({ className }: { className?: string }) {
  const profile = useMyProfile();
  const updatePrefs = useUpdateNotificationPreferences();

  if (!profile) return null;

  const needs = profile.allocationNeeds;
  const wants = profile.allocationWants;
  const savings = profile.allocationSavings;
  const dailyOn = profile.dailySummaryEnabled ?? true;
  const alertsOn = profile.cycleAlertsEnabled ?? true;

  async function patchPref(
    key: "dailySummaryEnabled" | "cycleAlertsEnabled",
    value: boolean,
  ) {
    try {
      await updatePrefs({ [key]: value });
    } catch (error) {
      toast.error(fromConvexError(error).message);
    }
  }

  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-faint md:hidden">
        {SETTINGS_SYSTEM_LABEL}
      </p>

      <div className="rounded-[14px] border border-line bg-card px-4 py-0.5 md:hidden">
        <Link
          href="/settings/allocations"
          className="flex items-center gap-2 border-b border-line-subtle py-2.5"
        >
          <span className="flex-1 text-[13.5px] text-ink">
            {SETTINGS_PERCENTAGES_LABEL}
          </span>
          <span className="flex gap-0.5">
            <span
              className={cn("size-1.5 rounded-full", envelopeDotClass("needs"))}
            />
            <span
              className={cn("size-1.5 rounded-full", envelopeDotClass("wants"))}
            />
            <span
              className={cn(
                "size-1.5 rounded-full",
                envelopeDotClass("savings"),
              )}
            />
          </span>
          <span className="text-[11.5px] text-faint">
            {needs}/{wants}/{savings}
          </span>
          <ListRowChevron />
        </Link>
        <Link
          href="/settings/cycle"
          className="flex items-center gap-2 border-b border-line-subtle py-2.5"
        >
          <span className="flex-1 text-[13.5px] text-ink">
            {SETTINGS_CYCLE_LABEL}
          </span>
          <span className="text-[11.5px] text-faint">
            {profile.cycleDurationDays ?? 30} dÃ­as
          </span>
          <ListRowChevron />
        </Link>
        <div className="flex items-center gap-2 py-2.5">
          <span className="flex-1 text-[13.5px] text-ink">
            {SETTINGS_PREFERENCES_LABEL}
          </span>
          <ListRowChevron />
        </div>
      </div>

      <h2 className="hidden font-serif text-2xl font-medium text-ink md:block">
        {SETTINGS_SYSTEM_HEADING}
      </h2>

      <div className="hidden flex-col gap-3.5 md:flex">
        <div className="rounded-2xl border border-line bg-card px-5 py-5 md:px-[22px] md:py-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
              {SETTINGS_PERCENTAGES_LABEL}
            </span>
            <span className="text-xs font-semibold text-qp-deep">
              {SETTINGS_PERCENTAGES_SUM_OK}
            </span>
          </div>
          <AllocationBar needs={needs} wants={wants} savings={savings} />
          <div className="mt-4 flex gap-2.5">
            {(
              [
                { label: "Necesidades", pct: needs, dot: "needs" },
                { label: "Gustos", pct: wants, dot: "wants" },
                { label: "Ahorro", pct: savings, dot: "savings" },
              ] as const
            ).map((item) => (
              <div
                key={item.label}
                className="flex-1 rounded-[11px] border border-line-subtle bg-surface-warm px-3 py-2.5"
              >
                <div className="mb-1 flex items-center gap-1.5 text-xs text-body-secondary">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      envelopeDotClass(item.dot),
                    )}
                  />
                  {item.label}
                </div>
                <div className="font-serif text-xl text-ink">{item.pct}%</div>
              </div>
            ))}
          </div>
          <Link
            href="/settings/allocations"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-3.5 border-line text-body-secondary",
            )}
          >
            {SETTINGS_ADJUST_ALLOCATIONS}
          </Link>
        </div>

        <div className="rounded-2xl border border-line bg-card px-5 py-5 md:px-[22px] md:py-5">
          <div className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
            {SETTINGS_CYCLE_LABEL}
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            {(
              [
                { label: SETTINGS_CYCLE_TYPE, value: formatCycleType(profile) },
                {
                  label: SETTINGS_CYCLE_START,
                  value: formatCycleStart(profile),
                },
                {
                  label: SETTINGS_CYCLE_PROFILE,
                  value: formatIncomeProfileLabel(profile),
                },
              ] as const
            ).map((card) => (
              <div
                key={card.label}
                className="flex-1 rounded-[11px] border border-line-subtle bg-surface-warm px-3.5 py-3"
              >
                <div className="text-[11.5px] text-mute">{card.label}</div>
                <div className="text-sm font-semibold text-ink">
                  {card.value}
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/settings/cycle"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-3.5 border-line text-body-secondary",
            )}
          >
            {SETTINGS_CHANGE_CYCLE}
          </Link>
        </div>

        <div className="rounded-2xl border border-line bg-card px-5 py-5 md:px-[22px] md:py-5">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
            {SETTINGS_PREFERENCES_LABEL}
          </div>
          <div className="divide-y divide-line-subtle">
            <div className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-sm text-ink">
                {SETTINGS_CURRENCY_LABEL}
              </span>
              <span className="text-[13.5px] text-mute">
                {SETTINGS_CURRENCY_VALUE}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-sm text-ink">
                {SETTINGS_LANGUAGE_LABEL}
              </span>
              <span className="text-[13.5px] text-mute">
                {SETTINGS_LANGUAGE_VALUE}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-sm text-ink">
                {SETTINGS_DAILY_SUMMARY_LABEL}
              </span>
              <SettingsToggle
                label={SETTINGS_DAILY_SUMMARY_LABEL}
                checked={dailyOn}
                onCheckedChange={(v) =>
                  void patchPref("dailySummaryEnabled", v)
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-sm text-ink">
                {SETTINGS_CYCLE_ALERTS_LABEL}
              </span>
              <SettingsToggle
                label={SETTINGS_CYCLE_ALERTS_LABEL}
                checked={alertsOn}
                onCheckedChange={(v) => void patchPref("cycleAlertsEnabled", v)}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

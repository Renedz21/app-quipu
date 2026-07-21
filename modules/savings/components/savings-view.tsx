"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { buttonVariants } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatCents } from "@/shared/lib/money";
import { cn } from "@/shared/lib/utils";
import {
  GOALS_NEW_CTA,
  GOALS_NEW_MOBILE_CTA,
  GOALS_SECTION_LABEL,
  SAVINGS_CYCLE_CONTRIBUTION_PREFIX,
  SAVINGS_CYCLE_CONTRIBUTION_SUFFIX,
  SAVINGS_EMPTY_BODY,
  SAVINGS_EMPTY_CTA,
  SAVINGS_EMPTY_TITLE,
  SAVINGS_ERROR_BODY,
  SAVINGS_ERROR_RETRY,
  SAVINGS_ERROR_TITLE,
  SAVINGS_MOBILE_SUBTITLE,
  SAVINGS_PAGE_SUBTITLE,
  SAVINGS_PAGE_TITLE,
  SAVINGS_TOTAL_SAVED_LABEL,
} from "../constants";
import { buildCycleContributionSubtitle } from "../lib/savingsCopy";
import { EmergencyFundHero } from "./emergency-fund-hero";
import { NewGoalDialog } from "./new-goal-dialog";
import { SavingsGoalCard } from "./savings-goal-card";

export function SavingsView() {
  const overview = useQuery(api.savings.getOverview, {});
  const [newGoalOpen, setNewGoalOpen] = useState(false);

  if (overview === undefined) {
    return <SavingsViewSkeleton />;
  }

  if (overview === null) {
    return (
      <section className="rounded-[14px] border border-danger-line bg-danger-bg p-5 md:p-6">
        <h2 className="text-base font-semibold text-danger-ink">
          {SAVINGS_ERROR_TITLE}
        </h2>
        <p className="mt-2 text-sm text-danger-text">{SAVINGS_ERROR_BODY}</p>
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mt-4 border-danger-line text-danger-ink hover:bg-danger-banner",
          )}
          onClick={() => window.location.reload()}
        >
          {SAVINGS_ERROR_RETRY}
        </button>
      </section>
    );
  }

  const cycleSubtitleActive = buildCycleContributionSubtitle(
    overview.cycleContributionCents,
    overview.hasActiveCycle,
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute md:hidden">
            {SAVINGS_PAGE_SUBTITLE}
          </p>
          <h1 className="font-serif text-[23px] font-medium text-ink md:text-[27px]">
            {SAVINGS_PAGE_TITLE}
          </h1>
          <p className="mt-1 text-[12.5px] text-mute-subtle md:text-[13.5px]">
            {cycleSubtitleActive ? (
              <>
                {SAVINGS_CYCLE_CONTRIBUTION_PREFIX}{" "}
                {formatCents(overview.cycleContributionCents, {
                  currency: overview.profile.currencyCode,
                })}{" "}
                {SAVINGS_CYCLE_CONTRIBUTION_SUFFIX}
              </>
            ) : (
              SAVINGS_MOBILE_SUBTITLE
            )}
          </p>
        </div>
        <span className="hidden rounded-lg border border-line bg-card px-3 py-2 font-mono text-[11px] text-mute md:inline">
          {SAVINGS_TOTAL_SAVED_LABEL} ·{" "}
          {formatCents(overview.totalSavedCents, {
            currency: overview.profile.currencyCode,
          })}
        </span>
      </header>

      {!overview.hasActiveCycle ? (
        <section className="mb-5 rounded-[14px] border border-line bg-card p-5 md:p-6">
          <h2 className="font-serif text-2xl text-ink">
            {SAVINGS_EMPTY_TITLE}
          </h2>
          <p className="mt-2 text-sm text-mute">{SAVINGS_EMPTY_BODY}</p>
          <Link
            href="/income/register"
            className={cn(
              buttonVariants(),
              "mt-4 inline-flex w-full md:w-auto",
            )}
          >
            {SAVINGS_EMPTY_CTA}
          </Link>
        </section>
      ) : null}

      {overview.emergencyFund ? (
        <EmergencyFundHero
          fund={overview.emergencyFund}
          currencyCode={overview.profile.currencyCode}
        />
      ) : null}

      <section className="mt-6">
        <div className="mb-3.5 flex items-center gap-2">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint">
            {GOALS_SECTION_LABEL}
          </span>
          <div className="h-px flex-1 bg-line-divider" />
          {overview.canCreateGoal ? (
            <button
              type="button"
              className="text-[12.5px] font-medium text-qp-deep md:hidden"
              onClick={() => setNewGoalOpen(true)}
            >
              {GOALS_NEW_MOBILE_CTA}
            </button>
          ) : null}
          {overview.canCreateGoal ? (
            <button
              type="button"
              className="hidden text-[12.5px] font-medium text-qp-deep md:inline"
              onClick={() => setNewGoalOpen(true)}
            >
              {GOALS_NEW_CTA}
            </button>
          ) : null}
        </div>

        {overview.goals.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-3">
            {overview.goals.map((goal) => (
              <SavingsGoalCard
                key={goal.id}
                goal={goal}
                currencyCode={overview.profile.currencyCode}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-[13px] border border-dashed border-line bg-surface-soft px-4 py-5 text-sm text-mute">
            Crea tu primera meta cuando quieras ir más allá del fondo de
            emergencia.
          </p>
        )}
      </section>

      <NewGoalDialog open={newGoalOpen} onOpenChange={setNewGoalOpen} />
    </div>
  );
}

function SavingsViewSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-2 h-4 w-64" />
      <Skeleton className="mt-6 h-56 w-full rounded-[20px]" />
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <Skeleton className="h-28 rounded-[13px]" />
        <Skeleton className="h-28 rounded-[13px]" />
        <Skeleton className="h-28 rounded-[13px]" />
      </div>
    </div>
  );
}

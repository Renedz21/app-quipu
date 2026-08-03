"use client";

import { Suspense, useEffect, useRef } from "react";
import { AnalyticsEvents, setPersonProperties, track } from "@/core/analytics";
import { formatCycleDayLine } from "../lib/dashboard-math";
import { useDashboardSummary } from "../queries";
import type { DashboardCoach } from "../types";
import { CoachCard } from "./coach-card";
import { CommitmentsList } from "./commitments-list";
import { CycleCloseReportCard } from "./cycle-close-report-card";
import { DashboardEmptyCycle } from "./dashboard-empty-cycle";
import { DashboardError } from "./dashboard-error";
import { DashboardHeader } from "./dashboard-header";
import { DashboardHero } from "./dashboard-hero";
import { DashboardHeroSkeleton } from "./dashboard-hero-skeleton";
import { DashboardSecondaryInsights } from "./dashboard-secondary-insights";
import { EnvelopeCards } from "./envelope-cards";
import { EnvelopeCardsSkeleton } from "./envelope-cards-skeleton";
import { RecentMovements } from "./recent-movements";

function isFullWidthCoach(coach: DashboardCoach | null | undefined): boolean {
  if (!coach) return false;
  return (
    coach.kind === "warning" ||
    coach.kind === "suggestion" ||
    coach.kind === "crisis"
  );
}

type Props = {
  profileName: string;
};

function DashboardContent({ profileName }: Props) {
  const summary = useDashboardSummary();
  const reviewTrackedForCycle = useRef<string | null>(null);

  useEffect(() => {
    if (!summary?.cycle || !summary.hero) return;
    const needsReview = summary.cycle.needsReview === true;
    const reservedCents = summary.hero.reservedCents ?? 0;
    const unallocatedCents = summary.cycle.unallocatedCents ?? 0;
    track(AnalyticsEvents.DASHBOARD_VIEWED, {
      cycle_id: summary.cycle.id,
      is_new_cycle: summary.isEarlyCycle ?? false,
      days_remaining: summary.cycle.daysRemaining,
      needs_review: needsReview,
      reserved_cents: reservedCents,
      unallocated_cents: unallocatedCents,
    });
    if (needsReview && reviewTrackedForCycle.current !== summary.cycle.id) {
      reviewTrackedForCycle.current = summary.cycle.id;
      track(AnalyticsEvents.ALLOCATION_REVIEW_SURFACED, {
        cycle_id: summary.cycle.id,
        reserved_cents: reservedCents,
        unallocated_cents: unallocatedCents,
        spendable_cents: summary.hero.spendableCents ?? 0,
      });
      setPersonProperties({
        allocation_needs_review: true,
        allocation_needs_review_cycle_id: summary.cycle.id,
      });
    }
  }, [summary]);

  if (summary === undefined) {
    return (
      <>
        <DashboardHeader name={profileName} />
        <DashboardHeroSkeleton />
        <EnvelopeCardsSkeleton />
      </>
    );
  }

  if (summary === null) {
    return <DashboardError />;
  }

  if (!summary.cycle || !summary.hero) {
    return (
      <>
        <DashboardHeader name={profileName} />
        <DashboardEmptyCycle
          profileName={profileName}
          currencyCode={summary.profile.currencyCode}
          commitments={summary.commitments}
        />
      </>
    );
  }

  return (
    <>
      <DashboardHeader
        name={profileName}
        cycleDayLine={formatCycleDayLine(
          summary.cycle.daysElapsed,
          summary.cycle.daysTotal,
        )}
      />

      <DashboardHero
        hero={summary.hero}
        cycle={summary.cycle}
        currencyCode={summary.profile.currencyCode}
      />

      <CycleCloseReportCard currencyCode={summary.profile.currencyCode} />

      <Suspense fallback={<EnvelopeCardsSkeleton />}>
        <div className="mt-3 space-y-3 md:mt-5 md:space-y-5">
          <EnvelopeCards
            envelopes={summary.envelopes}
            currencyCode={summary.profile.currencyCode}
            isEarlyCycle={summary.isEarlyCycle}
          />

          <RecentMovements
            movements={summary.movements}
            currencyCode={summary.profile.currencyCode}
            isEarlyCycle={summary.isEarlyCycle}
          />

          {summary.coach && isFullWidthCoach(summary.coach) ? (
            <CoachCard
              coach={summary.coach}
              currencyCode={summary.profile.currencyCode}
              layout="full"
              isPremium={summary.profile.plan === "premium"}
            />
          ) : null}

          <div className="grid gap-3 md:gap-4 lg:grid-cols-[1.25fr_1fr]">
            <CommitmentsList
              commitments={summary.commitments}
              currencyCode={summary.profile.currencyCode}
              isEarlyCycle={summary.isEarlyCycle}
            />
            {summary.coach && !isFullWidthCoach(summary.coach) ? (
              <CoachCard
                coach={summary.coach}
                currencyCode={summary.profile.currencyCode}
                isPremium={summary.profile.plan === "premium"}
              />
            ) : null}
          </div>

          <DashboardSecondaryInsights
            currencyCode={summary.profile.currencyCode}
            isPremium={summary.profile.plan === "premium"}
          />
        </div>
      </Suspense>
    </>
  );
}

export function DashboardView({ profileName }: Props) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-3 md:px-8 md:py-8">
      <DashboardContent profileName={profileName} />
    </div>
  );
}

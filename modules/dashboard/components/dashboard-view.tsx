"use client";

import { Suspense } from "react";
import { useDashboardSummary } from "../hooks/use-dashboard-summary";
import { CoachCard } from "./coach-card";
import { CommitmentsList } from "./commitments-list";
import { DashboardEmptyCycle } from "./dashboard-empty-cycle";
import { DashboardError } from "./dashboard-error";
import {
  buildDashboardCycleDayLine,
  DashboardHeader,
} from "./dashboard-header";
import { DashboardHero } from "./dashboard-hero";
import { DashboardHeroSkeleton } from "./dashboard-hero-skeleton";
import { EnvelopeCards } from "./envelope-cards";
import { EnvelopeCardsSkeleton } from "./envelope-cards-skeleton";
import { RecentMovements } from "./recent-movements";
import type { DashboardCoach } from "../types";

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
        cycleDayLine={buildDashboardCycleDayLine(
          summary.cycle.daysElapsed,
          summary.cycle.daysTotal,
        )}
      />

      <DashboardHero
        hero={summary.hero}
        cycle={summary.cycle}
        currencyCode={summary.profile.currencyCode}
      />

      <Suspense fallback={<EnvelopeCardsSkeleton />}>
        <div className="mt-5 space-y-5">
          <EnvelopeCards
            envelopes={summary.envelopes}
            currencyCode={summary.profile.currencyCode}
            isEarlyCycle={summary.isEarlyCycle}
          />

          <div className="grid gap-3 lg:grid-cols-[1.25fr_1fr]">
            <CommitmentsList
              commitments={summary.commitments}
              currencyCode={summary.profile.currencyCode}
              isEarlyCycle={summary.isEarlyCycle}
            />
            {summary.coach && !isFullWidthCoach(summary.coach) ? (
              <CoachCard
                coach={summary.coach}
                currencyCode={summary.profile.currencyCode}
              />
            ) : null}
          </div>

          {summary.coach && isFullWidthCoach(summary.coach) ? (
            <CoachCard
              coach={summary.coach}
              currencyCode={summary.profile.currencyCode}
              layout="full"
            />
          ) : null}

          <RecentMovements
            movements={summary.movements}
            currencyCode={summary.profile.currencyCode}
            isEarlyCycle={summary.isEarlyCycle}
          />
        </div>
      </Suspense>
    </>
  );
}

export function DashboardView({ profileName }: Props) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <DashboardContent profileName={profileName} />
    </div>
  );
}

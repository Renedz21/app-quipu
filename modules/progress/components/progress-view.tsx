"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { Check } from "reicon-react";
import { api } from "@/convex/_generated/api";
import { BackLink } from "@/shared/components/ui/back-link";
import { buttonVariants } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatLimaDate } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import {
  PROGRESS_ACHIEVEMENTS_LABEL,
  PROGRESS_BACK_LINK,
  PROGRESS_CHART_CAPTION,
  PROGRESS_CHART_LABEL,
  PROGRESS_ERROR_BODY,
  PROGRESS_ERROR_RETRY,
  PROGRESS_ERROR_TITLE,
  PROGRESS_PAGE_SUBTITLE,
  PROGRESS_PAGE_TITLE,
  PROGRESS_REWARDS_LINK,
  PROGRESS_STREAK_LABEL,
  PROGRESS_STREAK_SUFFIX,
  PROGRESS_STREAK_SUFFIX_MOBILE,
} from "../constants";
import type { ProgressAchievement, ProgressChartBar } from "../types";
import { ProgressStreakChart } from "./progress-streak-chart";

function AchievementCard({
  achievement,
}: {
  achievement: ProgressAchievement;
}) {
  const isDone = achievement.state === "done";
  const subtitle = isDone
    ? achievement.earnedAt
      ? formatLimaDate(achievement.earnedAt, "es-PE")
      : ""
    : (achievement.lockedHint ?? "");

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[14px] px-[18px] py-4 md:gap-[13px]",
        isDone
          ? "border border-line bg-surface"
          : "border border-dashed border-[#D8D3CB] bg-[#FAF8F5] opacity-75",
      )}
    >
      <span
        className={cn(
          "flex size-[34px] shrink-0 items-center justify-center rounded-full md:size-[42px]",
          isDone
            ? "border border-qp-border bg-qp-tint"
            : "border border-dashed border-[#C9C3BA]",
        )}
        aria-hidden
      >
        {isDone ? (
          <Check size={14} color="var(--qp)" strokeWidth={3} aria-hidden />
        ) : (
          <span className="font-serif text-xs text-faint md:text-[15px]">
            ···
          </span>
        )}
      </span>
      <div className="min-w-0">
        <div
          className={cn(
            "text-[12.5px] font-semibold md:text-[13.5px]",
            isDone ? "text-ink" : "text-ink-secondary",
          )}
        >
          {achievement.title}
        </div>
        {subtitle ? (
          <div
            className={cn(
              "text-[10.5px] md:text-[11.5px]",
              isDone ? "text-mute-subtle" : "text-faint",
            )}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProgressOverviewSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full rounded-[18px]" />
      <Skeleton className="h-24 w-full rounded-[14px]" />
    </div>
  );
}

export function ProgressView() {
  const overview = useQuery(api.progress.getOverview, {});

  if (overview === undefined) {
    return <ProgressOverviewSkeleton />;
  }

  if (overview === null) {
    return (
      <section className="rounded-[14px] border border-danger-line bg-danger-bg p-5 md:p-6">
        <h2 className="text-base font-semibold text-danger-ink">
          {PROGRESS_ERROR_TITLE}
        </h2>
        <p className="mt-2 text-sm text-danger-text">{PROGRESS_ERROR_BODY}</p>
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mt-4 border-danger-line text-danger-ink hover:bg-danger-banner",
          )}
          onClick={() => window.location.reload()}
        >
          {PROGRESS_ERROR_RETRY}
        </button>
      </section>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <BackLink
        href="/dashboard"
        className="text-[12.5px] text-ink-secondary hover:text-ink md:text-[13px]"
      >
        {PROGRESS_BACK_LINK}
      </BackLink>

      <header className="mt-3 mb-6 md:mt-3.5">
        <h1 className="font-serif text-[22px] font-medium text-ink md:text-[27px]">
          {PROGRESS_PAGE_TITLE}
        </h1>
        <p className="mt-1 text-[12.5px] text-mute-subtle md:text-[13.5px]">
          {PROGRESS_PAGE_SUBTITLE}
        </p>
      </header>

      <section className="mb-5 flex flex-col gap-5 rounded-[18px] border border-line bg-gradient-to-br from-[#FBFAF7] to-[#F6F4F0] p-[17px] md:mb-6 md:flex-row md:items-center md:gap-9 md:p-7">
        <div>
          <div className="mb-1.5 font-mono text-[9.5px] tracking-[0.1em] text-[#A6836A] uppercase md:mb-2 md:text-[10.5px]">
            {PROGRESS_STREAK_LABEL}
          </div>
          <div className="flex items-baseline gap-2 md:gap-2.5">
            <span className="font-serif text-[38px] leading-none text-ink md:text-[50px]">
              {overview.currentStreak}
            </span>
            <span className="text-[13px] text-ink-secondary md:text-[15px]">
              <span className="md:hidden">{PROGRESS_STREAK_SUFFIX_MOBILE}</span>
              <span className="hidden md:inline">
                {PROGRESS_STREAK_SUFFIX.split(" ").slice(0, 2).join(" ")}
                <br />
                {PROGRESS_STREAK_SUFFIX.split(" ").slice(2).join(" ")}
              </span>
            </span>
          </div>
        </div>

        <div className="flex-1 md:border-l md:border-line-divider md:pl-9">
          <div className="mb-2 text-[12px] text-ink-secondary md:mb-3 md:text-[12.5px]">
            {PROGRESS_CHART_LABEL}
          </div>
          <ProgressStreakChart
            bars={overview.chartBars as ProgressChartBar[]}
          />
          <p className="mt-2 text-[11px] text-mute-subtle md:mt-2.5 md:text-[11.5px]">
            {PROGRESS_CHART_CAPTION}
          </p>
        </div>
      </section>

      <div className="mb-3.5 flex items-center gap-2">
        <span className="font-mono text-[9.5px] tracking-[0.1em] text-mute-subtle uppercase md:text-[10.5px]">
          {PROGRESS_ACHIEVEMENTS_LABEL}
        </span>
        <span className="h-px flex-1 bg-line-divider" />
        <span className="text-[12px] text-mute-subtle">
          {overview.achievementsDoneCount} de {overview.achievementsTotal}
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-3 md:gap-3">
        {overview.achievements.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </div>

      <div className="mt-8">
        <Link
          href="/progress/rewards"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "border-line text-qp-deep hover:bg-qp-tint",
          )}
        >
          {PROGRESS_REWARDS_LINK}
        </Link>
      </div>
    </div>
  );
}

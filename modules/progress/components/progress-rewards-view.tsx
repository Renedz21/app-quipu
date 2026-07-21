"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { buttonVariants } from "@/shared/components/ui/button";
import { BackLink } from "@/shared/components/ui/back-link";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import {
  PROGRESS_BACK_LINK,
  PROGRESS_ERROR_BODY,
  PROGRESS_ERROR_RETRY,
  PROGRESS_ERROR_TITLE,
  REWARDS_ACCENT_LABEL,
  REWARDS_ACTIVATE,
  REWARDS_ACTIVE,
  REWARDS_CYCLES_MORE,
  REWARDS_ICON_LABEL,
  REWARDS_PAGE_SUBTITLE,
  REWARDS_PAGE_TITLE,
  REWARDS_PERSONALIZATION_LABEL,
  REWARDS_THEME_LABEL,
} from "../constants";

const ACCENT_SWATCH: Record<string, string> = {
  moss: "bg-qp",
  steel: "bg-[#41648A]",
  clay: "bg-[#A6836A]",
};

export function ProgressRewardsView() {
  const rewards = useQuery(api.progress.getRewards, {});
  const updateAppearance = useMutation(api.progress.updateAppearance);

  if (rewards === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full rounded-[13px]" />
      </div>
    );
  }

  if (rewards === null) {
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

  const activateReward = async (
    patch: Parameters<typeof updateAppearance>[0],
  ) => {
    await updateAppearance(patch);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-8">
      <BackLink
        href="/progress"
        className="text-[12.5px] text-ink-secondary hover:text-ink md:text-[13px]"
      >
        {PROGRESS_BACK_LINK}
      </BackLink>

      <header className="mt-3 mb-6">
        <h1 className="font-serif text-[22px] font-medium text-ink md:text-[24px]">
          {REWARDS_PAGE_TITLE}
        </h1>
        <p className="mt-1 text-[13px] text-mute-subtle">
          {REWARDS_PAGE_SUBTITLE}
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-2.5 md:gap-2.5">
        {rewards.rewards.map((reward) => {
          const locked = !reward.unlocked;
          return (
            <div
              key={reward.id}
              className={cn(
                "flex items-center gap-3 rounded-[13px] px-[17px] py-3.5 md:gap-3.5 md:py-3.5",
                locked
                  ? "border border-dashed border-[#D8D3CB] bg-[#FAF8F5] opacity-75"
                  : "border border-line bg-surface",
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-[11px] md:size-[38px]",
                  reward.id === "tinta_theme"
                    ? "bg-[#23201C]"
                    : reward.id === "clay_accent"
                      ? "border border-[#E7D9C8] bg-[#F2EDE7]"
                      : "border border-dashed border-[#C9C3BA]",
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "text-[12.5px] font-semibold md:text-sm",
                    locked ? "text-ink-secondary" : "text-ink",
                  )}
                >
                  {reward.title}
                </div>
                <div
                  className={cn(
                    "text-[10.5px] md:text-xs",
                    locked ? "text-faint" : "text-mute-subtle",
                  )}
                >
                  {reward.description}
                </div>
              </div>
              {locked ? (
                <span className="text-[11.5px] text-faint">
                  {"cyclesRemaining" in reward && reward.cyclesRemaining != null
                    ? REWARDS_CYCLES_MORE(reward.cyclesRemaining)
                    : `${Math.max(0, reward.requiredStreak - rewards.currentStreak)} ciclos más`}
                </span>
              ) : reward.id === "annual_report" ? (
                <span className="rounded-full bg-qp-tint px-2.5 py-1 text-[11.5px] font-semibold text-qp-deep">
                  Pronto
                </span>
              ) : (
                <button
                  type="button"
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10.5px] font-semibold md:text-[11.5px]",
                    reward.active
                      ? "bg-qp-tint text-qp-deep"
                      : "bg-qp-tint text-qp-deep hover:bg-qp-border",
                  )}
                  onClick={() => {
                    if (reward.id === "tinta_theme") {
                      void activateReward({ appearanceTheme: "tinta" });
                    }
                    if (reward.id === "clay_accent") {
                      void activateReward({ accentPreset: "clay" });
                    }
                  }}
                >
                  {reward.active ? REWARDS_ACTIVE : REWARDS_ACTIVATE}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-3.5 flex items-center gap-2">
        <span className="font-mono text-[10.5px] tracking-[0.1em] text-mute-subtle uppercase">
          {REWARDS_PERSONALIZATION_LABEL}
        </span>
        <span className="h-px flex-1 bg-line-divider" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <PersonalizationCard title={REWARDS_ACCENT_LABEL}>
          <div className="flex gap-2">
            {rewards.accents.map((accent) => {
              const locked = !accent.unlocked;
              const active = rewards.appearance.accent === accent.id;
              return (
                <button
                  key={accent.id}
                  type="button"
                  disabled={locked}
                  aria-label={accent.id}
                  className={cn(
                    "size-[30px] rounded-[9px] border",
                    ACCENT_SWATCH[accent.id],
                    active ? "border-ink ring-2 ring-ink/20" : "border-line",
                    locked && "cursor-not-allowed opacity-40",
                  )}
                  onClick={() =>
                    void activateReward({ accentPreset: accent.id })
                  }
                />
              );
            })}
          </div>
        </PersonalizationCard>

        <PersonalizationCard title={REWARDS_THEME_LABEL}>
          <div className="flex gap-2">
            {rewards.themes.map((theme) => {
              const locked = !theme.unlocked;
              const active = rewards.appearance.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  disabled={locked}
                  className={cn(
                    "h-[30px] w-11 rounded-lg border",
                    theme.id === "light" ? "bg-[#FBFAF7]" : "bg-[#23201C]",
                    active ? "border-ink ring-2 ring-ink/20" : "border-line",
                    locked && "cursor-not-allowed opacity-40",
                  )}
                  onClick={() =>
                    void activateReward({
                      appearanceTheme: theme.id,
                    })
                  }
                />
              );
            })}
          </div>
        </PersonalizationCard>

        <PersonalizationCard title={REWARDS_ICON_LABEL}>
          <div className="flex gap-2">
            {rewards.appIcons.map((icon) => {
              const active = rewards.appearance.appIcon === icon.id;
              return (
                <button
                  key={icon.id}
                  type="button"
                  className={cn(
                    "flex size-[30px] items-center justify-center rounded-[9px] border",
                    icon.id === "light" ? "bg-[#FBFAF7]" : "bg-[#23201C]",
                    active ? "border-ink" : "border-line",
                  )}
                  onClick={() =>
                    void activateReward({ appIconVariant: icon.id })
                  }
                >
                  <span className="flex flex-col gap-0.5">
                    <span
                      className={cn(
                        "h-0.5 w-2.5 rounded-sm",
                        icon.id === "light" ? "bg-qp" : "bg-[#FBFAF7]",
                      )}
                    />
                    <span className="h-0.5 w-[7px] rounded-sm bg-[#A6836A]" />
                  </span>
                </button>
              );
            })}
          </div>
        </PersonalizationCard>
      </div>
    </div>
  );
}

function PersonalizationCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[13px] border border-line bg-surface px-[18px] py-4">
      <div className="mb-3 text-[12.5px] font-semibold text-ink-secondary">
        {title}
      </div>
      {children}
    </div>
  );
}

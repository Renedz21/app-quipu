"use client";

import { Button } from "@/shared/components/ui/button";
import { formatCents } from "@/shared/lib/money";
import { GOAL_CONTRIBUTE_CTA, GOAL_PROGRESS_OF } from "../constants";
import type { SavingsGoal } from "../types";

type Props = {
  goal: SavingsGoal;
  currencyCode: string;
  availableToContributeCents: number;
  hasActiveCycle: boolean;
  onContribute: () => void;
};

export function SavingsGoalCard({
  goal,
  currencyCode,
  availableToContributeCents,
  hasActiveCycle,
  onContribute,
}: Props) {
  const hasTarget =
    goal.targetAmount !== undefined && goal.targetAmount !== null;
  const currentLabel = formatCents(goal.currentAmount, {
    currency: currencyCode,
  });
  const targetLabel = hasTarget
    ? formatCents(goal.targetAmount ?? 0, { currency: currencyCode })
    : null;

  return (
    <article className="rounded-[13px] border border-line bg-card p-3 md:p-[17px]">
      <div className="mb-2 flex items-center justify-between gap-2 md:mb-1 md:block">
        <h3 className="text-[13px] font-semibold text-ink md:text-sm">
          {goal.label}
        </h3>
        {hasTarget ? (
          <p className="text-[11.5px] text-mute-subtle md:hidden">
            {currentLabel} / {targetLabel}
          </p>
        ) : null}
      </div>
      {hasTarget ? (
        <p className="mb-3 hidden text-xs text-mute-subtle md:block">
          {currentLabel} {GOAL_PROGRESS_OF} {targetLabel}
        </p>
      ) : (
        <p className="mb-3 text-xs text-mute-subtle">
          {currentLabel} · sin meta fija
        </p>
      )}
      <div className="h-[5px] overflow-hidden rounded-[3px] bg-line-section">
        <div
          className="h-full bg-mute"
          style={{
            width: `${hasTarget ? goal.progressPercent : Math.min(goal.currentAmount > 0 ? 12 : 0, 100)}%`,
          }}
        />
      </div>
      {hasActiveCycle ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 w-full rounded-[11px]"
          disabled={availableToContributeCents <= 0}
          onClick={onContribute}
        >
          {GOAL_CONTRIBUTE_CTA}
        </Button>
      ) : null}
    </article>
  );
}

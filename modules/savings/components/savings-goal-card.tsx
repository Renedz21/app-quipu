"use client";

import { formatCents } from "@/shared/lib/money";
import { GOAL_PROGRESS_OF } from "../constants";
import type { SavingsGoal } from "../types";

type Props = {
  goal: SavingsGoal;
  currencyCode: string;
};

export function SavingsGoalCard({ goal, currencyCode }: Props) {
  const hasTarget =
    goal.targetAmount !== undefined && goal.targetAmount !== null;

  return (
    <article className="rounded-[13px] border border-line bg-card p-4 md:p-[17px]">
      <h3 className="mb-1 text-sm font-semibold text-ink">{goal.label}</h3>
      <p className="mb-3 text-xs text-mute-subtle">
        {formatCents(goal.currentAmount, { currency: currencyCode })}
        {hasTarget ? (
          <>
            {" "}
            {GOAL_PROGRESS_OF}{" "}
            {formatCents(goal.targetAmount ?? 0, { currency: currencyCode })}
          </>
        ) : (
          " · sin meta fija"
        )}
      </p>
      <div className="h-1.5 overflow-hidden rounded-[3px] bg-line-section">
        <div
          className="h-full bg-mute"
          style={{
            width: `${hasTarget ? goal.progressPercent : Math.min(goal.currentAmount > 0 ? 12 : 0, 100)}%`,
          }}
        />
      </div>
    </article>
  );
}

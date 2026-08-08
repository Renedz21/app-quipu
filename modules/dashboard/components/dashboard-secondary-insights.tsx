"use client";

import { useState } from "react";
import { ChevronDown } from "reicon-react/icons/ChevronDown";
import { DASHBOARD_SECONDARY_INSIGHTS_LABEL } from "../constants";
import { CycleForecastCard } from "./cycle-forecast-card";
import { UpcomingCommitmentsBadge } from "./upcoming-commitments-badge";

type Props = {
  currencyCode: string;
  isPremium: boolean;
};

export function DashboardSecondaryInsights({ currencyCode, isPremium }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-3 md:space-y-4">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full items-center gap-2 rounded-xl border border-line/70 bg-surface-warm/40 px-3 py-2.5 text-left md:hidden"
      >
        <span className="text-[12.5px] font-medium text-ink-secondary">
          {DASHBOARD_SECONDARY_INSIGHTS_LABEL}
        </span>
        <ChevronDown
          size={16}
          color="var(--mute)"
          aria-hidden
          className={`ml-auto shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`space-y-3 md:space-y-4 ${expanded ? "block" : "hidden md:block"}`}
      >
        <UpcomingCommitmentsBadge
          currencyCode={currencyCode}
          isPremium={isPremium}
        />
        <CycleForecastCard currencyCode={currencyCode} isPremium={isPremium} />
      </div>
    </div>
  );
}

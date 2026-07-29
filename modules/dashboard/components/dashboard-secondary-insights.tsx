"use client";

import { useState } from "react";
import { ChevronDown } from "reicon-react";
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
        className="flex w-full items-center gap-2 rounded-[12px] border border-line bg-surface-warm px-3 py-2.5 text-left md:hidden"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-mute">
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

import { formatCents } from "@/shared/lib/money";
import {
  HERO_AVAILABLE_BODY,
  HERO_AVAILABLE_LABEL,
  HERO_CYCLE_HEALTH,
  HERO_DAYS_REMAINING,
  STATUS_BADGE_LABELS,
} from "../constants";
import { clampPercent, getStatusBadgeClasses } from "../lib/dashboard-math";
import type {
  DashboardCycle,
  DashboardHero as DashboardHeroData,
} from "../types";

type Props = {
  hero: DashboardHeroData;
  cycle: DashboardCycle;
  currencyCode: string;
};

export function DashboardHero({ hero, cycle, currencyCode }: Props) {
  const badgeClasses = getStatusBadgeClasses(hero.statusBadge);

  return (
    <section
      aria-labelledby="dashboard-hero-title"
      className="mb-3.5 rounded-[18px] border border-line bg-qp-gradient p-5 shadow-[0_1px_2px_color-mix(in_oklch,var(--qp-ink)_3%,transparent)] md:p-7"
    >
      <div className="flex flex-col gap-6 md:flex-row md:gap-9">
        <div className="flex-[1.3]">
          <div className="mb-2 flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-qp" aria-hidden />
            <p
              id="dashboard-hero-title"
              className="font-mono text-[11px] uppercase tracking-[0.1em] text-qp-deep"
            >
              {HERO_AVAILABLE_LABEL}
            </p>
          </div>
          <p className="font-serif text-[34px] font-medium leading-none tracking-[-0.015em] text-ink md:text-[64px]">
            {formatCents(hero.displayDailyCents, { currency: currencyCode })}
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-secondary md:text-[14.5px]">
            {HERO_AVAILABLE_BODY}{" "}
            <span className="font-semibold text-qp-deep">
              {hero.validationCopy}
            </span>
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-center border-t border-qp-border pt-5 md:border-t-0 md:border-l md:pl-8 md:pt-0">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[13px] text-ink-secondary">
              {HERO_DAYS_REMAINING}
            </span>
            <span className="font-serif text-[19px] text-ink">
              {cycle.daysRemaining}
            </span>
          </div>
          <div
            className="mb-4 h-2 overflow-hidden rounded-[5px] bg-qp-track md:h-2"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={clampPercent(cycle.progressPercent)}
          >
            <div
              className="h-full rounded-[5px] bg-qp transition-all"
              style={{ width: `${clampPercent(cycle.progressPercent)}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-ink-secondary">
              {HERO_CYCLE_HEALTH}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-semibold ${badgeClasses.container}`}
            >
              <span
                className={`size-1.5 rounded-full ${badgeClasses.dot}`}
                aria-hidden
              />
              {STATUS_BADGE_LABELS[hero.statusBadge]}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

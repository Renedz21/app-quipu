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
  const progressPercent = clampPercent(cycle.progressPercent);

  return (
    <section
      aria-labelledby="dashboard-hero-title"
      className="mb-2.5 rounded-[16px] border border-line bg-linear-to-tr from-qp-gradient to-qp-gradient/10 p-3.5 shadow-[0_1px_2px_color-mix(in_oklch,var(--qp-ink)_3%,transparent)] md:mb-3.5 md:rounded-[18px] md:p-7"
    >
      <div className="flex flex-col md:flex-row md:gap-9">
        <div className="min-w-0 flex-[1.3]">
          <div className="mb-1.5 flex items-center gap-2 md:mb-2">
            <span className="size-1.5 rounded-full bg-qp" aria-hidden />
            <p
              id="dashboard-hero-title"
              className="font-mono text-[10px] uppercase tracking-widest text-qp-deep md:text-[11px]"
            >
              {HERO_AVAILABLE_LABEL}
            </p>
          </div>
          <p className="font-serif text-[40px] font-medium leading-none tracking-[-0.02em] text-ink md:text-[64px] md:tracking-[-0.015em]">
            {formatCents(hero.displayDailyCents, { currency: currencyCode })}
          </p>
          <p className="mt-2 max-w-md text-xs leading-snug text-ink-secondary md:mt-3 md:max-w-sm md:text-sm md:leading-relaxed md:text-[14.5px]">
            {hero.bodyCopy ? (
              hero.bodyCopy
            ) : (
              <>
                {HERO_AVAILABLE_BODY}{" "}
                <span className="font-semibold text-qp-deep">
                  {hero.validationCopy}
                </span>
              </>
            )}
          </p>

          <div className="mt-3 md:hidden">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs text-ink-secondary">
                {cycle.daysRemaining} días restantes
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeClasses.container}`}
              >
                <span
                  className={`size-1.5 rounded-full ${badgeClasses.dot}`}
                  aria-hidden
                />
                {STATUS_BADGE_LABELS[hero.statusBadge]}
              </span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-[4px] bg-qp-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
            >
              <div
                className="h-full rounded-[4px] bg-qp transition-[width]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="hidden flex-1 flex-col justify-center border-l border-qp-border pl-8 md:flex">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[13px] text-ink-secondary">
              {HERO_DAYS_REMAINING}
            </span>
            <span className="font-serif text-[19px] text-ink">
              {cycle.daysRemaining}
            </span>
          </div>
          <div
            className="mb-4 h-2 overflow-hidden rounded-[5px] bg-qp-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
          >
            <div
              className="h-full rounded-[5px] bg-qp transition-[width]"
              style={{ width: `${progressPercent}%` }}
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

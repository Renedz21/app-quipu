import { buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  SETTINGS_PLAN_ACTIVE_BADGE,
  SETTINGS_PLAN_CHANGE_CARD,
  SETTINGS_PLAN_FREE_NAME,
  SETTINGS_PLAN_LABEL,
  SETTINGS_PLAN_MANAGE,
  SETTINGS_PLAN_MANAGE_HINT,
  SETTINGS_PLAN_PLUS_NAME,
} from "../constants";
import type { SettingsSubscriptionOverview } from "../types";

type Props = {
  subscription: SettingsSubscriptionOverview;
  className?: string;
};

export function SettingsPlanCard({ subscription, className }: Props) {
  const isPremium = subscription.plan === "premium";

  return (
    <section
      className={cn(
        "rounded-2xl border border-line bg-card px-5 py-5 md:px-6 md:py-[22px]",
        className,
      )}
    >
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
          {SETTINGS_PLAN_LABEL}
        </span>
        {isPremium ? (
          <span className="rounded-full bg-qp-soft px-2.5 py-0.5 text-[10.5px] font-semibold text-qp-deep">
            {SETTINGS_PLAN_ACTIVE_BADGE}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-baseline gap-2.5">
        <span className="font-serif text-2xl text-ink">
          {isPremium ? SETTINGS_PLAN_PLUS_NAME : SETTINGS_PLAN_FREE_NAME}
        </span>
        {subscription.priceDisplay ? (
          <span className="text-sm text-mute">{subscription.priceDisplay}</span>
        ) : null}
      </div>
      {subscription.renewalSummary ? (
        <p className="mt-1.5 text-[12.5px] leading-snug text-mute-subtle">
          {subscription.renewalSummary}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled
          title={SETTINGS_PLAN_MANAGE_HINT}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "border-line text-ink-secondary",
          )}
        >
          {SETTINGS_PLAN_MANAGE}
        </button>
        {isPremium ? (
          <button
            type="button"
            disabled
            title={SETTINGS_PLAN_MANAGE_HINT}
            className="px-1.5 py-2 text-[13px] font-semibold text-faint"
          >
            {SETTINGS_PLAN_CHANGE_CARD}
          </button>
        ) : null}
      </div>
    </section>
  );
}

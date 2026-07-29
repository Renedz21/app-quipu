"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChatDots } from "reicon-react";
import { AnalyticsEvents, track } from "@/core/analytics";
import { CoachCrisisActions } from "@/modules/coach/components/coach-crisis-actions";
import { CoachNudgeActions } from "@/modules/coach/components/coach-nudge-actions";
import { EXPENSE_NO_CYCLE_HINT } from "@/modules/expenses/constants";
import { useExpenseRegister } from "@/modules/expenses/hooks/use-expense-register-context";
import { PremiumLockCard } from "@/shared/components/premium-lock-card";
import { Button } from "@/shared/components/ui/button";
import {
  COACH_EARLY_REGISTER_CTA,
  COACH_EARLY_VIEW_SYSTEM_CTA,
  COACH_KIND_LABELS,
  COACH_TRANQUIL_SAVE_MORE_CTA,
  COACH_TRANQUIL_VIEW_CTA,
  COACH_WARNING_ADJUST_CTA,
  COACH_WARNING_VIEW_CTA,
  DASHBOARD_ENVELOPES_SECTION_ID,
} from "../constants";
import type { DashboardCoach } from "../types";

type Props = {
  coach: DashboardCoach;
  currencyCode: string;
  layout?: "inline" | "full";
};

const INSIGHT_TYPE_BY_KIND: Record<DashboardCoach["kind"], string> = {
  tranquil: "tranquil",
  warning: "warning",
  suggestion: "suggestion",
  crisis: "crisis",
  contigo: "early_cycle",
};

function coachSectionClass(
  kind: DashboardCoach["kind"],
  layout: "inline" | "full",
) {
  const fullRow = layout === "full";

  switch (kind) {
    case "warning":
      return [
        "border-warning-border bg-warning-bg",
        fullRow ? "shadow-amber" : "",
      ].join(" ");
    case "crisis":
      return [
        "border-danger-line bg-danger-banner",
        fullRow ? "border-[1.5px] shadow-crisis" : "",
      ].join(" ");
    case "suggestion":
      return "border-qp-border bg-[linear-gradient(160deg,var(--qp-coach-from),var(--qp-coach-to))]";
    default:
      return "border-qp-border bg-[linear-gradient(160deg,var(--qp-coach-from),var(--qp-coach-to))]";
  }
}

function coachBadgeClass(kind: DashboardCoach["kind"]) {
  switch (kind) {
    case "warning":
      return "bg-warning-border text-warning-text";
    case "crisis":
      return "bg-danger-line text-danger-ink";
    case "suggestion":
      return "bg-qp-soft text-qp-deep";
    default:
      return "bg-qp-soft text-qp-deep";
  }
}

function coachIconClass(kind: DashboardCoach["kind"]) {
  switch (kind) {
    case "warning":
      return "bg-warning";
    case "crisis":
      return "bg-danger";
    default:
      return "bg-qp";
  }
}

function scrollToEnvelopes() {
  document
    .getElementById(DASHBOARD_ENVELOPES_SECTION_ID)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function CoachCard({ coach, currencyCode, layout = "inline" }: Props) {
  const router = useRouter();
  const { open } = useExpenseRegister();
  const isContigo = coach.kind === "contigo";
  const isTranquil = coach.kind === "tranquil";
  const isWarning = coach.kind === "warning";
  const isCrisis = coach.kind === "crisis";
  const isSuggestion = coach.kind === "suggestion";

  const [rescueUpsell, setRescueUpsell] = useState(false);

  useEffect(() => {
    track(AnalyticsEvents.FINANCIAL_INSIGHT_VIEWED, {
      insight_type: INSIGHT_TYPE_BY_KIND[coach.kind],
    });
  }, [coach.kind]);

  return (
    <section
      aria-labelledby="dashboard-coach"
      className={`flex flex-col rounded-[14px] border p-4 md:p-5 ${coachSectionClass(coach.kind, layout)}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`flex size-7 items-center justify-center rounded-[9px] ${coachIconClass(coach.kind)}`}
        >
          <ChatDots size={16} color="var(--qp-canvas)" aria-hidden />
        </span>
        <h2 id="dashboard-coach" className="text-sm font-semibold text-ink">
          Coach
        </h2>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${coachBadgeClass(coach.kind)}`}
        >
          {COACH_KIND_LABELS[coach.kind]}
        </span>
      </div>

      <p
        className={`font-serif text-[15px] leading-snug md:text-[19px] md:leading-normal ${
          isCrisis ? "text-danger-ink" : "text-ink"
        }`}
      >
        {coach.message}
      </p>

      {isContigo ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            title={EXPENSE_NO_CYCLE_HINT}
            onClick={() => open({ variant: "fab" })}
            className="rounded-[11px] bg-ink text-canvas hover:bg-ink/90"
          >
            {COACH_EARLY_REGISTER_CTA}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled
            title="Próximamente"
            className="rounded-[11px] border-line bg-canvas/70 text-ink-secondary"
          >
            {COACH_EARLY_VIEW_SYSTEM_CTA}
          </Button>
        </div>
      ) : null}

      {isTranquil ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={scrollToEnvelopes}
            className="rounded-[11px] border-qp-border bg-canvas/70 text-qp-deep"
          >
            {COACH_TRANQUIL_VIEW_CTA}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => router.push("/savings/move")}
            className="rounded-[11px] bg-qp text-canvas hover:bg-qp/90"
          >
            {COACH_TRANQUIL_SAVE_MORE_CTA}
          </Button>
        </div>
      ) : null}

      {isWarning ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => router.push("/income/register")}
            className="rounded-[11px] bg-warning text-canvas hover:bg-warning/90"
          >
            {COACH_WARNING_ADJUST_CTA}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={scrollToEnvelopes}
            className="rounded-[11px] border-warning-border bg-canvas/70 text-warning-text"
          >
            {COACH_WARNING_VIEW_CTA}
          </Button>
        </div>
      ) : null}

      {isSuggestion && coach.interactionId ? (
        <CoachNudgeActions
          interactionId={coach.interactionId}
          options={coach.options ?? []}
          currencyCode={currencyCode}
          rescueSuggestion={coach.rescueSuggestion}
          awaitingRescueConfirmation={coach.awaitingRescueConfirmation}
          onFreeRescueUpsell={() => setRescueUpsell(true)}
        />
      ) : null}

      {rescueUpsell ? (
        <div className="mt-4">
          <PremiumLockCard
            title="El rescate es parte de Quipu Plus"
            body="Mueve dinero entre sobres sin tener que pensarlo tú. Y mucho más: predicciones por sobre, plan de crisis en un paso, avisos de compromisos e informe de cierre."
          />
        </div>
      ) : null}

      {isCrisis ? (
        <CoachCrisisActions options={coach.crisisOptions ?? []} />
      ) : null}
    </section>
  );
}

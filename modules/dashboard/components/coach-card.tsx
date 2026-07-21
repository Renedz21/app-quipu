import { CoachNudgeActions } from "@/modules/coach/components/coach-nudge-actions";
import { COACH_KIND_LABELS } from "../constants";
import type { DashboardCoach } from "../types";

type Props = {
  coach: DashboardCoach;
};

export function CoachCard({ coach }: Props) {
  const isCrisis = coach.kind === "crisis";

  return (
    <section
      aria-labelledby="dashboard-coach"
      className={`flex flex-col rounded-[14px] border bg-[linear-gradient(160deg,var(--qp-coach-from),var(--qp-coach-to))] p-4 md:p-5 ${
        isCrisis ? "border-danger-line md:col-span-2" : "border-qp-border"
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-[9px] bg-qp">
          <span className="flex flex-col gap-0.5" aria-hidden>
            <span className="h-0.5 w-2.5 rounded-sm bg-canvas" />
            <span className="h-0.5 w-2 rounded-sm bg-canvas" />
            <span className="h-0.5 w-1 rounded-sm bg-canvas" />
          </span>
        </span>
        <h2 id="dashboard-coach" className="text-sm font-semibold text-ink">
          Coach
        </h2>
        <span className="ml-auto rounded-full bg-qp-soft px-2 py-0.5 text-[11px] font-semibold text-qp-deep">
          {COACH_KIND_LABELS[coach.kind]}
        </span>
      </div>

      <p className="font-serif text-[15px] leading-snug text-ink md:text-[19px] md:leading-normal">
        {coach.message}
      </p>

      {coach.interactionId && coach.options?.length ? (
        <CoachNudgeActions
          interactionId={coach.interactionId}
          options={coach.options}
        />
      ) : null}
    </section>
  );
}

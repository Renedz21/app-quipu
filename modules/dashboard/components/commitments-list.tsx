import { Calendar, Check, Home, ShoppingBag } from "reicon-react";
import { Button } from "@/shared/components/ui/button";
import { formatCents } from "@/shared/lib/money";
import {
  COMMITMENTS_COVERED_HEADER,
  COMMITMENTS_EMPTY_BODY,
  COMMITMENTS_EMPTY_CTA,
  COMMITMENTS_EMPTY_CTA_HINT,
  COMMITMENTS_EMPTY_TITLE,
  COMMITMENTS_SECTION_LABEL,
  COMMITMENTS_UNCOVERED_HEADER,
  ENVELOPE_LABELS,
} from "../constants";
import { allCommitmentsCovered, formatDueInDays } from "../lib/dashboard-math";
import type { DashboardCommitment } from "../types";

type Props = {
  commitments: DashboardCommitment[];
  currencyCode: string;
  isEarlyCycle?: boolean;
};

function CommitmentIcon({ envelope }: { envelope: "needs" | "wants" }) {
  if (envelope === "wants") {
    return (
      <span className="flex size-8 items-center justify-center rounded-[9px] bg-clay-soft">
        <ShoppingBag
          size={14}
          color="var(--clay)"
          className="shrink-0"
          aria-hidden
        />
      </span>
    );
  }

  return (
    <span className="flex size-8 items-center justify-center rounded-[9px] bg-steel-soft">
      <Home size={14} color="var(--steel)" className="shrink-0" aria-hidden />
    </span>
  );
}

function CommitmentsEmptyState() {
  return (
    <div className="flex flex-col items-center px-2 py-4 text-center md:px-4 md:py-6">
      <span
        className="mb-3 flex size-10 items-center justify-center rounded-[11px] bg-surface-warm"
        aria-hidden
      >
        <Calendar size={18} color="var(--mute)" />
      </span>
      <p className="text-sm font-semibold text-ink">{COMMITMENTS_EMPTY_TITLE}</p>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-mute">
        {COMMITMENTS_EMPTY_BODY}
      </p>
      <Button
        type="button"
        variant="outline"
        disabled
        title={COMMITMENTS_EMPTY_CTA_HINT}
        className="mt-4 rounded-[11px] border-line px-4 text-ink-secondary"
      >
        {COMMITMENTS_EMPTY_CTA}
      </Button>
    </div>
  );
}

function formatCoverageLabel(commitment: DashboardCommitment): string {
  if (commitment.coverageStatus === "covered") return "";
  if (commitment.cascadeStatus === "overdue") return " · vencido";
  if (commitment.coverageStatus === "partial") return " · parcial";
  return " · sin cubrir";
}

function CommitmentProgress({
  progressPercent,
}: {
  progressPercent: number;
}) {
  return (
    <div
      className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-warm"
      aria-hidden
    >
      <div
        className="h-full rounded-full bg-qp transition-[width]"
        style={{ width: `${progressPercent}%` }}
      />
    </div>
  );
}

export function CommitmentsList({
  commitments,
  currencyCode,
  isEarlyCycle = false,
}: Props) {
  const covered = allCommitmentsCovered(commitments);
  const showRichEmpty = isEarlyCycle && commitments.length === 0;

  return (
    <section
      aria-labelledby="dashboard-commitments"
      className="rounded-[14px] border border-line bg-card p-4 md:p-5"
    >
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h2
          id="dashboard-commitments"
          className="text-sm font-semibold text-ink md:text-[14.5px]"
        >
          {COMMITMENTS_SECTION_LABEL}
        </h2>
        {!showRichEmpty ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-qp-deep">
            {covered ? (
              <>
                <span className="flex size-4 items-center justify-center rounded-full bg-qp-soft">
                  <Check size={10} color="var(--qp)" strokeWidth={3} aria-hidden />
                </span>
                {COMMITMENTS_COVERED_HEADER}
              </>
            ) : (
              COMMITMENTS_UNCOVERED_HEADER
            )}
          </span>
        ) : null}
      </div>

      {showRichEmpty ? (
        <CommitmentsEmptyState />
      ) : commitments.length === 0 ? (
        <p className="text-sm text-mute">
          Aún no tienes compromisos registrados.
        </p>
      ) : (
        <ul className="divide-y divide-line-divider">
          {commitments.map((commitment) => (
            <li
              key={commitment.id}
              className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <CommitmentIcon envelope={commitment.envelope} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold text-ink">
                  {commitment.name}
                </div>
                <div className="text-[11.5px] text-mute">
                  {formatDueInDays(commitment.daysUntilDue)} ·{" "}
                  {ENVELOPE_LABELS[commitment.envelope]}
                  {formatCoverageLabel(commitment)}
                </div>
                {commitment.coverageStatus !== "covered" ? (
                  <CommitmentProgress
                    progressPercent={commitment.progressPercent}
                  />
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <span className="font-serif text-base text-ink">
                  {formatCents(commitment.amount, { currency: currencyCode })}
                </span>
                {commitment.coverageStatus === "partial" ? (
                  <div className="text-[10.5px] text-mute">
                    {commitment.progressPercent}% cubierto
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

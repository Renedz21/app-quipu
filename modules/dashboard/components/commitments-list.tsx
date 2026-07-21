import { formatCents } from "@/shared/lib/money";
import {
  COMMITMENTS_COVERED_HEADER,
  COMMITMENTS_SECTION_LABEL,
  COMMITMENTS_UNCOVERED_HEADER,
  ENVELOPE_LABELS,
} from "../constants";
import { allCommitmentsCovered, formatDueInDays } from "../lib/dashboard-math";
import type { DashboardCommitment } from "../types";

type Props = {
  commitments: DashboardCommitment[];
  currencyCode: string;
};

function CommitmentIcon({ envelope }: { envelope: "needs" | "wants" }) {
  if (envelope === "wants") {
    return (
      <span className="flex size-8 items-center justify-center rounded-[9px] bg-clay-soft">
        <span className="size-2.5 rounded-full border-[1.6px] border-clay" />
      </span>
    );
  }

  return (
    <span className="flex size-8 items-center justify-center rounded-[9px] bg-steel-soft">
      <span className="size-3 rounded-[3px] border-[1.6px] border-steel" />
    </span>
  );
}

export function CommitmentsList({ commitments, currencyCode }: Props) {
  const covered = allCommitmentsCovered(commitments);

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
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-qp-deep">
          {covered ? (
            <>
              <span className="flex size-4 items-center justify-center rounded-full bg-qp-soft">
                <span className="inline-block size-1.5 rotate-45 border-r-[1.5px] border-b-[1.5px] border-qp" />
              </span>
              {COMMITMENTS_COVERED_HEADER}
            </>
          ) : (
            COMMITMENTS_UNCOVERED_HEADER
          )}
        </span>
      </div>

      {commitments.length === 0 ? (
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
                  {commitment.coverageStatus !== "covered"
                    ? ` · ${commitment.coverageStatus === "partial" ? "parcial" : "sin cubrir"}`
                    : ""}
                </div>
              </div>
              <span className="font-serif text-base text-ink">
                {formatCents(commitment.amount, { currency: currencyCode })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

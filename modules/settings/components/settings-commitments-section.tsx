"use client";

import { useState } from "react";
import { AddCommitmentDialog } from "@/shared/components/commitments/add-commitment-dialog";
import { ADD_COMMITMENT_CTA } from "@/shared/constants/commitments";
import { ENVELOPE_LABELS } from "@/shared/constants/envelopes";
import { formatCents } from "@/shared/lib/money";
import { cn } from "@/shared/lib/utils";
import {
  SETTINGS_COMMITMENTS_EMPTY,
  SETTINGS_COMMITMENTS_LABEL,
  SETTINGS_COMMITMENTS_TOTAL_SUFFIX,
} from "../constants";
import { useSettingsCommitments } from "../queries";

function envelopeDot(envelope: "needs" | "wants") {
  return envelope === "needs" ? "bg-needs" : "bg-clay";
}

export function SettingsCommitmentsSection({
  className,
  id = "compromisos",
}: {
  className?: string;
  id?: string;
}) {
  const commitments = useSettingsCommitments();
  const [addOpen, setAddOpen] = useState(false);

  if (commitments === undefined) {
    return (
      <div
        id={id}
        className={cn(
          "h-64 animate-pulse scroll-mt-6 rounded-2xl border border-line bg-card",
          className,
        )}
      />
    );
  }

  const totalCents = commitments.reduce((sum, c) => sum + c.amount, 0);

  return (
    <section
      id={id}
      className={cn(
        "flex scroll-mt-6 flex-col rounded-2xl border border-line bg-card px-4 py-4 md:px-[22px] md:py-5",
        className,
      )}
    >
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
          {SETTINGS_COMMITMENTS_LABEL}
        </span>
        {commitments.length > 0 ? (
          <span className="text-xs text-mute">
            {formatCents(totalCents)} {SETTINGS_COMMITMENTS_TOTAL_SUFFIX}
          </span>
        ) : null}
      </div>

      {commitments.length === 0 ? (
        <p className="mb-3 flex-1 text-[13px] text-mute md:mb-0">
          {SETTINGS_COMMITMENTS_EMPTY}
        </p>
      ) : (
        <ul className="flex-1 divide-y divide-line-subtle">
          {commitments.map((commitment) => (
            <li
              key={commitment._id}
              className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  envelopeDot(commitment.envelope),
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold text-ink">
                  {commitment.name}
                </div>
                <div className="text-[11px] text-faint">
                  {ENVELOPE_LABELS[commitment.envelope]} · día{" "}
                  {commitment.dueDay}
                </div>
              </div>
              <span className="font-serif text-[15px] text-ink">
                {formatCents(commitment.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="mt-3 w-full shrink-0 rounded-[11px] border border-dashed border-qp-border bg-card py-2.5 text-[13.5px] font-semibold text-qp-deep transition-colors hover:bg-qp-soft md:mt-auto"
      >
        {ADD_COMMITMENT_CTA}
      </button>

      <AddCommitmentDialog open={addOpen} onOpenChange={setAddOpen} />
    </section>
  );
}

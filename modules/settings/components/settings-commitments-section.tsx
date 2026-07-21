"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { ENVELOPE_LABELS } from "@/modules/dashboard/constants";
import { formatCents } from "@/shared/lib/money";
import { cn } from "@/shared/lib/utils";
import {
  SETTINGS_ADD_COMMITMENT,
  SETTINGS_COMMITMENTS_EMPTY,
  SETTINGS_COMMITMENTS_LABEL,
  SETTINGS_COMMITMENTS_TOTAL_SUFFIX,
} from "../constants";
import { AddCommitmentDialog } from "./add-commitment-dialog";

function envelopeDot(envelope: "needs" | "wants") {
  return envelope === "needs" ? "bg-needs" : "bg-clay";
}

export function SettingsCommitmentsSection({ className }: { className?: string }) {
  const commitments = useQuery(api.fixedCommitments.listMyCommitments, {});
  const [addOpen, setAddOpen] = useState(false);

  if (commitments === undefined) {
    return (
      <div
        className={cn(
          "h-64 animate-pulse rounded-2xl border border-line bg-card",
          className,
        )}
      />
    );
  }

  const totalCents = commitments.reduce((sum, c) => sum + c.amount, 0);

  return (
    <section
      id="settings-commitments"
      className={cn(
        "rounded-2xl border border-line bg-card px-5 py-5 md:px-[22px] md:py-5",
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
        <p className="mb-3 text-[13px] text-mute">{SETTINGS_COMMITMENTS_EMPTY}</p>
      ) : (
        <ul className="divide-y divide-line-subtle">
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
                  {ENVELOPE_LABELS[commitment.envelope]} · día {commitment.dueDay}
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
        className="mt-3 w-full rounded-[11px] border border-dashed border-qp-border bg-card py-2.5 text-[13.5px] font-semibold text-qp-deep transition-colors hover:bg-qp-soft"
      >
        {SETTINGS_ADD_COMMITMENT}
      </button>

      <AddCommitmentDialog open={addOpen} onOpenChange={setAddOpen} />
    </section>
  );
}

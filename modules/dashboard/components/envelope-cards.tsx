"use client";

import type { KeyboardEvent } from "react";
import { useExpenseRegister } from "@/modules/expenses/hooks/use-expense-register-context";
import type { ExpenseEnvelopeType } from "@/modules/expenses/lib/envelopeSuggestion";
import { formatCents } from "@/shared/lib/money";
import {
  DASHBOARD_ENVELOPES_SECTION_ID,
  ENVELOPE_EARLY_NEEDS_WANTS_SUBCOPY,
  ENVELOPE_EARLY_SAVINGS_SUBCOPY,
  ENVELOPE_LABELS,
} from "../constants";
import { clampPercent } from "../lib/dashboard-math";
import type { DashboardEnvelope } from "../types";
import { EnvelopeSectionLabel } from "./envelope-cards-skeleton";

type Props = {
  envelopes: DashboardEnvelope[];
  currencyCode: string;
  isEarlyCycle?: boolean;
};

const ENVELOPE_STYLES = {
  needs: {
    dot: "bg-steel",
    track: "bg-steel-soft",
    bar: "bg-steel",
  },
  wants: {
    dot: "bg-clay",
    track: "bg-clay-soft",
    bar: "bg-clay",
  },
  savings: {
    dot: "bg-moss",
    track: "bg-moss-soft",
    bar: "bg-moss",
  },
} as const;

export function EnvelopeCards({
  envelopes,
  currencyCode,
  isEarlyCycle = false,
}: Props) {
  const { open } = useExpenseRegister();

  function handleEnvelopeClick(type: "needs" | "wants" | "savings") {
    if (type === "savings") return;
    open({
      variant: "envelope",
      preselectedEnvelope: type as ExpenseEnvelopeType,
    });
  }

  return (
    <section
      id={DASHBOARD_ENVELOPES_SECTION_ID}
      aria-labelledby="dashboard-envelopes-heading"
    >
      <EnvelopeSectionLabel />
      <div className="grid gap-3 md:grid-cols-3">
        {envelopes.map((envelope) => {
          const styles = ENVELOPE_STYLES[envelope.type];
          const percent = clampPercent(envelope.percentRemaining);

          return (
            <article
              key={envelope.type}
              className={`rounded-[14px] border border-line bg-card p-4 md:p-5 ${
                envelope.type !== "savings"
                  ? "cursor-pointer transition-colors hover:bg-surface-warm"
                  : ""
              }`}
              {...(envelope.type !== "savings"
                ? {
                    role: "button" as const,
                    tabIndex: 0,
                    onClick: () => handleEnvelopeClick(envelope.type),
                    onKeyDown: (event: KeyboardEvent) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleEnvelopeClick(envelope.type);
                      }
                    },
                  }
                : {})}
            >
              <div className="mb-3.5 flex items-center gap-2">
                <span
                  className={`size-2 rounded-full ${styles.dot}`}
                  aria-hidden
                />
                <h3 className="text-sm font-semibold text-ink">
                  {ENVELOPE_LABELS[envelope.type]}
                </h3>
                {envelope.type === "savings" && percent >= 100 ? (
                  <span className="ml-auto rounded-full bg-qp-soft px-2 py-0.5 text-[11px] font-semibold text-qp-deep">
                    100%
                  </span>
                ) : null}
              </div>
              <p className="font-serif text-2xl text-ink">
                {formatCents(
                  isEarlyCycle
                    ? envelope.allocatedAmount
                    : Math.max(0, envelope.remainingAmount),
                  {
                    currency: currencyCode,
                  },
                )}
              </p>
              <p className="mt-1 text-xs text-mute">
                {isEarlyCycle ? (
                  envelope.type === "savings" ? (
                    ENVELOPE_EARLY_SAVINGS_SUBCOPY
                  ) : (
                    ENVELOPE_EARLY_NEEDS_WANTS_SUBCOPY
                  )
                ) : (
                  <>
                    {envelope.type === "savings" ? "apartado" : "disponible"} de{" "}
                    {formatCents(envelope.allocatedAmount, {
                      currency: currencyCode,
                    })}
                  </>
                )}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-[4px] bg-qp-track">
                <div
                  className={`h-full rounded-[4px] ${styles.bar}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

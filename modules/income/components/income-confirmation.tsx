"use client";

import Link from "next/link";
import { ENVELOPE_LABELS } from "@/modules/dashboard/constants";
import { buttonVariants } from "@/shared/components/ui/button";
import { formatCents } from "@/shared/lib/money";
import { cn } from "@/shared/lib/utils";
import {
  ENVELOPE_INCOME_STYLES,
  getIncomeSourceLabel,
  INCOME_HOME_CTA,
  INCOME_SUCCESS_BODY_PREFIX,
  INCOME_SUCCESS_BODY_SUFFIX,
  INCOME_SUCCESS_DAILY_LABEL,
  INCOME_SUCCESS_TITLE,
} from "../constants";
import type { IncomeRegisterResult } from "../types";

type Props = {
  result: IncomeRegisterResult;
  currencyCode: string;
};

export function IncomeConfirmation({ result, currencyCode }: Props) {
  const sourceLabel = getIncomeSourceLabel(result.source);

  return (
    <div className="mx-auto max-w-2xl px-1 py-6 text-center md:px-4 md:py-10">
      <div className="rounded-[18px] bg-[radial-gradient(110%_60%_at_50%_0%,var(--qp-soft),var(--qp-surface)_60%)] px-4 py-8 md:px-10 md:py-12">
        <div className="mx-auto mb-5 flex size-[70px] items-center justify-center rounded-full bg-qp shadow-[0_14px_34px_-14px_var(--qp-shadow-strong)]">
          <span
            className="inline-block size-4 rotate-45 border-r-4 border-b-4 border-canvas"
            aria-hidden
          />
        </div>

        <h2 className="font-serif text-[30px] font-medium text-ink">
          {INCOME_SUCCESS_TITLE}
        </h2>

        <p className="mt-2 text-[15px] text-mute">
          {formatCents(result.amount, { currency: currencyCode })} de{" "}
          {sourceLabel.toLowerCase()} {INCOME_SUCCESS_BODY_PREFIX}{" "}
          {INCOME_SUCCESS_BODY_SUFFIX}
        </p>

        <div className="mt-7 grid gap-3 text-left md:grid-cols-3">
          {result.envelopes.map((envelope) => {
            const styles = ENVELOPE_INCOME_STYLES[envelope.type];
            return (
              <div
                key={envelope.type}
                className="rounded-[14px] border border-line bg-card px-[18px] py-4"
              >
                <div className="mb-2 flex items-center gap-2 text-[12.5px] text-mute">
                  <span
                    className={`size-2 rounded-full ${styles.dot}`}
                    aria-hidden
                  />
                  {ENVELOPE_LABELS[envelope.type]}
                </div>
                <div className="font-serif text-xl text-ink">
                  {formatCents(envelope.remainingAmount, {
                    currency: currencyCode,
                  })}
                </div>
                <div className="mt-0.5 text-[11.5px] text-qp-deep">
                  +{" "}
                  {formatCents(envelope.delta, {
                    currency: currencyCode,
                    showSymbol: false,
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 rounded-[12px] border border-qp-border bg-qp-soft px-3.5 py-3.5 text-sm text-qp-deep">
          {INCOME_SUCCESS_DAILY_LABEL}{" "}
          <span className="font-serif text-[19px] text-ink">
            {formatCents(result.displayDailyCents, { currency: currencyCode })}
          </span>
        </div>

        <Link
          href="/dashboard"
          className={cn(
            buttonVariants(),
            "mt-6 inline-flex h-12 rounded-[11px] bg-ink px-8 text-[15px] font-semibold text-canvas hover:bg-ink/90",
          )}
        >
          {INCOME_HOME_CTA}
        </Link>
      </div>
    </div>
  );
}

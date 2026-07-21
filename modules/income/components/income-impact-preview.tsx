"use client";

import { ENVELOPE_LABELS } from "@/shared/constants/envelopes";
import { formatCents } from "@/shared/lib/money";
import {
  ENVELOPE_INCOME_STYLES,
  INCOME_IMPACT_TITLE,
  INCOME_NEW_DAILY_LABEL,
} from "../constants";
import type { ImpactPreviewResult } from "../lib/impactPreview";

type Props = {
  preview: ImpactPreviewResult | null;
  currencyCode: string;
};

export function IncomeImpactPreview({ preview, currencyCode }: Props) {
  return (
    <div className="rounded-2xl border border-qp-border bg-[linear-gradient(160deg,var(--qp-soft),var(--qp-canvas)_70%)] p-5 md:p-6">
      <p className="mb-4 font-mono text-[10.5px] tracking-[0.1em] text-qp-deep uppercase">
        {INCOME_IMPACT_TITLE}
      </p>

      {!preview ? (
        <p className="text-sm text-mute">
          Ingresa un monto para ver cómo se reparte.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {(["needs", "wants", "savings"] as const).map((type) => {
              const styles = ENVELOPE_INCOME_STYLES[type];
              const delta = preview.distribution[type];
              const percent = preview.weightPercents[type];

              return (
                <div key={type}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm text-ink">
                      <span
                        className={`size-2 rounded-full ${styles.dot}`}
                        aria-hidden
                      />
                      {ENVELOPE_LABELS[type]}
                      <span className="text-xs text-mute">· {percent}%</span>
                    </span>
                    <span className="font-serif text-lg text-qp-deep">
                      + {formatCents(delta, { currency: currencyCode })}
                    </span>
                  </div>
                  <div
                    className={`h-1.5 overflow-hidden rounded-sm ${styles.track}`}
                  >
                    <div
                      className={`h-full ${styles.bar}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-qp-border pt-4">
            <span className="text-[13px] text-qp-deep">
              {INCOME_NEW_DAILY_LABEL}
            </span>
            <span className="font-serif text-[22px] text-ink">
              {formatCents(preview.projectedDailyCents, {
                currency: currencyCode,
              })}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { Safe } from "reicon-react";
import { formatCents } from "@/shared/lib/money";
import {
  EMERGENCY_FUND_AUTO_CONTRIBUTION_PREFIX,
  EMERGENCY_FUND_AUTO_CONTRIBUTION_SUFFIX,
  EMERGENCY_FUND_LABEL,
  EMERGENCY_FUND_PRIORITY_BADGE,
  EMERGENCY_FUND_TARGET_SUFFIX,
} from "../constants";
import type { SavingsEmergencyFund } from "../types";

type Props = {
  fund: SavingsEmergencyFund;
  currencyCode: string;
  detailHref?: string;
};

export function EmergencyFundHero({
  fund,
  currencyCode,
  detailHref = "/savings/fund",
}: Props) {
  const content = (
    <>
      <div
        className="pointer-events-none absolute -top-10 -right-8 size-56 rounded-full bg-[radial-gradient(circle,var(--qp-track),transparent_70%)]"
        aria-hidden
      />
      <div className="relative mb-4 flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-[9px] bg-moss text-white">
          <Safe size={14} color="currentColor" aria-hidden />
        </span>
        <span className="text-base font-semibold text-ink">
          {EMERGENCY_FUND_LABEL}
        </span>
        <span className="rounded-full bg-qp-panel px-2.5 py-0.5 text-[10.5px] font-semibold text-qp-deep">
          {EMERGENCY_FUND_PRIORITY_BADGE}
        </span>
      </div>

      <div className="relative flex flex-wrap items-end gap-3">
        <p className="font-serif text-[34px] leading-none text-ink md:text-[52px]">
          {formatCents(fund.currentAmount, { currency: currencyCode })}
        </p>
        <p className="pb-1 text-sm text-qp-text">
          de {formatCents(fund.targetAmount, { currency: currencyCode })} ·{" "}
          {EMERGENCY_FUND_TARGET_SUFFIX}
        </p>
      </div>

      <div className="relative mt-5 h-3 overflow-hidden rounded-lg bg-qp-track">
        <div
          className="h-full rounded-lg bg-gradient-to-r from-moss-soft to-moss"
          style={{ width: `${fund.progressPercent}%` }}
        />
      </div>

      <div className="relative mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span className="font-semibold text-qp-deep">
          {fund.monthsCoveredCopy}
        </span>
        {fund.cycleContributionCents > 0 ? (
          <span className="text-mute">
            {EMERGENCY_FUND_AUTO_CONTRIBUTION_PREFIX}{" "}
            {formatCents(fund.cycleContributionCents, {
              currency: currencyCode,
            })}{" "}
            {EMERGENCY_FUND_AUTO_CONTRIBUTION_SUFFIX}
          </span>
        ) : null}
      </div>
    </>
  );

  return (
    <article className="relative overflow-hidden rounded-[20px] border border-qp-shield-line bg-gradient-to-br from-qp-shield-from to-qp-shield-to p-5 md:p-7">
      {detailHref ? (
        <Link
          href={detailHref}
          className="block rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-qp-selected"
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </article>
  );
}

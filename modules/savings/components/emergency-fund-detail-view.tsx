"use client";

import { useQuery } from "convex/react";
import { Safe } from "reicon-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/shared/components/ui/button";
import { BackLink } from "@/shared/components/ui/back-link";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatCents } from "@/shared/lib/money";
import {
  EMERGENCY_FUND_ADJUST_CTA,
  EMERGENCY_FUND_ADJUST_HINT,
  EMERGENCY_FUND_DETAIL_BACK,
  EMERGENCY_FUND_DETAIL_BODY,
  EMERGENCY_FUND_DETAIL_MOBILE_BODY,
  EMERGENCY_FUND_LABEL,
  EMERGENCY_FUND_STAT_COMPLETE,
  EMERGENCY_FUND_STAT_CYCLE,
  EMERGENCY_FUND_STAT_CYCLES_SUFFIX,
  EMERGENCY_FUND_STAT_STREAK,
  EMERGENCY_FUND_TARGET_SUFFIX,
} from "../constants";
import { formatCyclesToCompleteLabel } from "../lib/savingsCopy";
import { SavingsContributeButton } from "./savings-contribute-button";

export function EmergencyFundDetailView() {
  const detail = useQuery(api.savings.getEmergencyFundDetail, {});

  if (detail === undefined) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-8">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-10 w-56" />
        <Skeleton className="mt-6 h-40 w-full rounded-[13px]" />
      </div>
    );
  }

  if (detail === null || !detail.emergencyFund) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-8">
        <BackLink href="/savings" className="text-sm text-mute">
          {EMERGENCY_FUND_DETAIL_BACK}
        </BackLink>
        <p className="mt-6 text-sm text-mute">
          Aún no encontramos tu fondo de emergencia.
        </p>
      </div>
    );
  }

  const { emergencyFund, profile } = detail;

  return (
    <div className="mx-auto w-full max-w-3xl bg-gradient-to-b from-qp-success to-canvas px-4 py-6 md:px-8 md:py-8">
      <BackLink href="/savings" className="text-[13px] text-mute">
        {EMERGENCY_FUND_DETAIL_BACK}
      </BackLink>

      <div className="mt-4 flex items-center gap-3">
        <span className="flex size-[34px] items-center justify-center rounded-[10px] bg-moss text-white">
          <Safe size={14} color="currentColor" aria-hidden />
        </span>
        <h1 className="font-serif text-[21px] font-medium text-ink md:text-[26px]">
          {EMERGENCY_FUND_LABEL}
        </h1>
      </div>

      <p className="mt-1 max-w-xl text-[12.5px] text-qp-text md:text-sm">
        <span className="md:hidden">{EMERGENCY_FUND_DETAIL_MOBILE_BODY}</span>
        <span className="hidden md:inline">{EMERGENCY_FUND_DETAIL_BODY}</span>
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <p className="font-serif text-4xl leading-none text-ink md:text-[46px]">
          {formatCents(emergencyFund.currentAmount, {
            currency: profile.currencyCode,
          })}
        </p>
        <p className="pb-1 text-sm text-mute">
          de{" "}
          {formatCents(emergencyFund.targetAmount, {
            currency: profile.currencyCode,
          })}
        </p>
        <p className="ml-auto font-mono text-[19px] text-qp-deep md:text-2xl">
          {emergencyFund.progressPercent}%
        </p>
      </div>

      <div className="mt-2 h-3 overflow-hidden rounded-lg bg-qp-track">
        <div
          className="h-full rounded-lg bg-gradient-to-r from-moss-soft to-moss"
          style={{ width: `${emergencyFund.progressPercent}%` }}
        />
      </div>

      <div className="mt-2 flex justify-between text-[10.5px] text-faint md:text-[11.5px]">
        <span>1 mes</span>
        <span>2 meses</span>
        <span>
          3 meses · {EMERGENCY_FUND_TARGET_SUFFIX.replace("meta de ", "")}
        </span>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <StatCard
          label={EMERGENCY_FUND_STAT_CYCLE}
          value={formatCents(emergencyFund.cycleContributionCents, {
            currency: profile.currencyCode,
          })}
        />
        <StatCard
          label={EMERGENCY_FUND_STAT_COMPLETE}
          value={formatCyclesToCompleteLabel(emergencyFund.cyclesToComplete)}
        />
        <StatCard
          label={EMERGENCY_FUND_STAT_STREAK}
          value={`${emergencyFund.contributionStreak} ${EMERGENCY_FUND_STAT_CYCLES_SUFFIX}`}
        />
      </div>

      <div className="mt-6 flex flex-col gap-2.5 md:flex-row">
        <SavingsContributeButton
          subEnvelopeId={emergencyFund.id}
          availableToContributeCents={emergencyFund.availableToContributeCents}
          currencyCode={profile.currencyCode}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled
          title={EMERGENCY_FUND_ADJUST_HINT}
        >
          {EMERGENCY_FUND_ADJUST_CTA}
        </Button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[13px] border border-line bg-card p-4 md:p-[17px]">
      <p className="text-xs text-mute">{label}</p>
      <p className="mt-1.5 font-serif text-xl text-ink md:text-[22px]">
        {value}
      </p>
    </article>
  );
}

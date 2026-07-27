"use client";

import { useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { AddCommitmentDialog } from "@/shared/components/commitments/add-commitment-dialog";
import { CommitmentCoverageList } from "@/shared/components/commitments/commitment-coverage-list";
import type { CommitmentCoverageItem } from "@/shared/components/commitments/commitment-coverage-list";
import { BackLink } from "@/shared/components/ui/back-link";
import { buttonVariants } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ADD_COMMITMENT_CTA } from "@/shared/constants/commitments";
import { formatLimaDate } from "@/shared/lib/date";
import { formatCents } from "@/shared/lib/money";
import { cn } from "@/shared/lib/utils";
import {
  COMMITMENTS_BACK_LINK,
  COMMITMENTS_EMPTY_BODY,
  COMMITMENTS_EMPTY_TITLE,
  COMMITMENTS_ERROR_BODY,
  COMMITMENTS_ERROR_RETRY,
  COMMITMENTS_ERROR_TITLE,
  COMMITMENTS_NO_CYCLE_NOTE,
  COMMITMENTS_PAGE_SUBTITLE,
  COMMITMENTS_PAGE_TITLE,
  COMMITMENTS_TOTAL_SUFFIX,
} from "../constants";
import { CommitmentDetailSheet } from "./commitment-detail-sheet";
import type { CommitmentForDetail } from "./commitment-detail-sheet";

export function CommitmentsViewSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-6 md:px-0 md:py-8">
      <Skeleton variant="line" className="h-4 w-20" />
      <Skeleton className="mt-4 h-9 w-48 rounded-lg" />
      <Skeleton variant="line" className="mt-2 h-4 w-full max-w-md" />
      <Skeleton className="mt-6 h-72 w-full rounded-[14px] [animation-delay:150ms]" />
    </div>
  );
}

export function CommitmentsView() {
  const data = useQuery(api.fixedCommitments.getCommitmentCoverage, {});
  const searchParams = useSearchParams();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedCommitment, setSelectedCommitment] =
    useState<CommitmentForDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  function openCommitmentDetail(commitment: CommitmentCoverageItem) {
    if (!commitment.nextDueAt) return;
    setSelectedCommitment({
      id: commitment.id,
      name: commitment.name,
      amount: commitment.amount,
      envelope: commitment.envelope,
      nextDueAt: commitment.nextDueAt,
      daysUntilDue: commitment.daysUntilDue,
      coverageStatus: commitment.coverageStatus,
      paymentStatus: commitment.paymentStatus,
      paidAtForCycle: commitment.paidAtForCycle,
    });
    setDetailOpen(true);
  }

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setAddOpen(true);
    }
  }, [searchParams]);

  if (data === undefined) {
    return <CommitmentsViewSkeleton />;
  }

  if (data === null) {
    return (
      <section className="mx-auto w-full max-w-2xl rounded-[14px] border border-danger-line bg-danger-bg p-5 md:p-6">
        <h2 className="text-base font-semibold text-danger-ink">
          {COMMITMENTS_ERROR_TITLE}
        </h2>
        <p className="mt-2 text-sm text-danger-text">
          {COMMITMENTS_ERROR_BODY}
        </p>
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mt-4 border-danger-line text-danger-ink hover:bg-danger-banner",
          )}
          onClick={() => window.location.reload()}
        >
          {COMMITMENTS_ERROR_RETRY}
        </button>
      </section>
    );
  }

  const cycleRange =
    data.cycle != null
      ? `${formatLimaDate(data.cycle.startDate)} – ${formatLimaDate(data.cycle.endDate)}`
      : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-6 md:px-0 md:py-8">
      <BackLink
        href="/dashboard"
        className="text-sm font-medium text-qp-deep hover:underline"
      >
        {COMMITMENTS_BACK_LINK}
      </BackLink>

      <header className="mt-4">
        <h1 className="font-serif text-[28px] leading-tight text-ink md:text-[32px]">
          {COMMITMENTS_PAGE_TITLE}
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-mute">
          {COMMITMENTS_PAGE_SUBTITLE}
        </p>
        {cycleRange ? (
          <p className="mt-2 font-mono text-[10.5px] uppercase tracking-widest text-mute">
            Ciclo · {cycleRange}
          </p>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-mute">
            {COMMITMENTS_NO_CYCLE_NOTE}
          </p>
        )}
      </header>

      <div className="mt-6 overflow-hidden rounded-[14px] border border-line bg-card">
        {data.commitments.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <h2 className="text-base font-semibold text-ink">
              {COMMITMENTS_EMPTY_TITLE}
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-mute">
              {COMMITMENTS_EMPTY_BODY}
            </p>
            <button
              type="button"
              className={cn(buttonVariants(), "mt-6")}
              onClick={() => setAddOpen(true)}
            >
              {ADD_COMMITMENT_CTA}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-line-divider px-4 py-3 md:px-4.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-mute">
                Próximos vencimientos
              </span>
              <span className="text-xs text-mute">
                {formatCents(data.totalCents, { currency: data.currencyCode })}{" "}
                {COMMITMENTS_TOTAL_SUFFIX}
              </span>
            </div>
            <CommitmentCoverageList
              commitments={data.commitments}
              currencyCode={data.currencyCode}
              showCoverageHeader
              onCommitmentClick={openCommitmentDetail}
            />
            <div className="border-t border-line-divider p-4 md:px-4.5">
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="w-full rounded-[11px] border border-dashed border-qp-border bg-card py-2.5 text-[13.5px] font-semibold text-qp-deep transition-colors hover:bg-qp-soft"
              >
                {ADD_COMMITMENT_CTA}
              </button>
            </div>
          </>
        )}
      </div>

      <AddCommitmentDialog open={addOpen} onOpenChange={setAddOpen} />
      <CommitmentDetailSheet
        commitment={selectedCommitment}
        currencyCode={data.currencyCode}
        hasActiveCycle={data.cycle != null}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

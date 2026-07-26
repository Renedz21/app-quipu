"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { IncomeSource } from "@/modules/income/types";
import { BackLink } from "@/shared/components/ui/back-link";
import { buttonVariants } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatLimaDate, formatLimaDateTime } from "@/shared/lib/date";
import { formatCents } from "@/shared/lib/money";
import { cn } from "@/shared/lib/utils";
import {
  MOVEMENTS_BACK_LINK,
  MOVEMENTS_EMPTY_BODY,
  MOVEMENTS_EMPTY_CTA,
  MOVEMENTS_EMPTY_TITLE,
  MOVEMENTS_ERROR_BODY,
  MOVEMENTS_ERROR_RETRY,
  MOVEMENTS_ERROR_TITLE,
  MOVEMENTS_NO_CYCLE_BODY,
  MOVEMENTS_NO_CYCLE_CTA,
  MOVEMENTS_NO_CYCLE_TITLE,
  MOVEMENTS_PAGE_SUBTITLE,
  MOVEMENTS_PAGE_TITLE,
} from "../constants";
import type { MovementForDetail } from "./movement-detail-sheet";
import { MovementDetailSheet } from "./movement-detail-sheet";

const MOVEMENT_DOT = {
  expense: {
    Necesidades: "bg-steel",
    Gustos: "bg-clay",
    default: "bg-mute",
  },
  income: "bg-qp",
} as const;

function MovementsViewSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-6 md:px-0 md:py-8">
      <Skeleton variant="line" className="h-4 w-20" />
      <Skeleton className="mt-4 h-9 w-56 rounded-lg" />
      <Skeleton variant="line" className="mt-2 h-4 w-full max-w-md" />
      <Skeleton className="mt-6 h-64 w-full rounded-[14px] [animation-delay:150ms]" />
    </div>
  );
}

type MovementItem = NonNullable<
  NonNullable<
    ReturnType<typeof useQuery<typeof api.movements.listForActiveCycle>>
  >
>["movements"][number];

function dotClass(movement: MovementItem): string {
  if (movement.kind === "income") {
    return movement.isExtraordinaryIncome
      ? "bg-extraordinary-a"
      : MOVEMENT_DOT.income;
  }
  const label = movement.envelopeLabel as
    | keyof typeof MOVEMENT_DOT.expense
    | undefined;
  if (label === "Necesidades") return MOVEMENT_DOT.expense.Necesidades;
  if (label === "Gustos") return MOVEMENT_DOT.expense.Gustos;
  return MOVEMENT_DOT.expense.default;
}

export function MovementsView() {
  const data = useQuery(api.movements.listForActiveCycle, {});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] =
    useState<MovementForDetail | null>(null);

  function openDetail(movement: MovementItem) {
    const detail: MovementForDetail = {
      id: movement.id,
      kind: movement.kind,
      label: movement.label,
      amount: movement.amount,
      timestamp: movement.timestamp,
      isExtraordinaryIncome: movement.isExtraordinaryIncome,
      envelopeType:
        "envelopeType" in movement
          ? (movement.envelopeType as "needs" | "wants" | undefined)
          : undefined,
      occurredAt:
        "occurredAt" in movement
          ? (movement.occurredAt as number | undefined)
          : undefined,
      source:
        "source" in movement
          ? (movement.source as IncomeSource | undefined)
          : undefined,
      incomeKind:
        "incomeKind" in movement
          ? (movement.incomeKind as "habitual" | "extraordinary" | undefined)
          : undefined,
    };
    setSelectedMovement(detail);
    setSheetOpen(true);
  }

  if (data === undefined) {
    return <MovementsViewSkeleton />;
  }

  if (data === null) {
    return (
      <section className="mx-auto w-full max-w-2xl rounded-[14px] border border-danger-line bg-danger-bg p-5 md:p-6">
        <h2 className="text-base font-semibold text-danger-ink">
          {MOVEMENTS_ERROR_TITLE}
        </h2>
        <p className="mt-2 text-sm text-danger-text">{MOVEMENTS_ERROR_BODY}</p>
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mt-4 border-danger-line text-danger-ink hover:bg-danger-banner",
          )}
          onClick={() => window.location.reload()}
        >
          {MOVEMENTS_ERROR_RETRY}
        </button>
      </section>
    );
  }

  const cycleRange =
    data.cycle != null
      ? `${formatLimaDate(data.cycle.startDate)} – ${formatLimaDate(data.cycle.endDate)}`
      : null;

  return (
    <>
      <div className="mx-auto w-full max-w-2xl px-5 py-6 md:px-0 md:py-8">
        <BackLink
          href="/dashboard"
          className="text-sm font-medium text-qp-deep hover:underline"
        >
          {MOVEMENTS_BACK_LINK}
        </BackLink>

        <header className="mt-4">
          <h1 className="font-serif text-[28px] leading-tight text-ink md:text-[32px]">
            {MOVEMENTS_PAGE_TITLE}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-mute">
            {MOVEMENTS_PAGE_SUBTITLE}
          </p>
          {cycleRange ? (
            <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
              Ciclo · {cycleRange}
            </p>
          ) : null}
        </header>

        <div className="mt-6 overflow-hidden rounded-[14px] border border-line bg-card">
          {data.cycle == null ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <h2 className="text-base font-semibold text-ink">
                {MOVEMENTS_NO_CYCLE_TITLE}
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-mute">
                {MOVEMENTS_NO_CYCLE_BODY}
              </p>
              <Link
                href="/income/register"
                className={cn(buttonVariants(), "mt-6")}
              >
                {MOVEMENTS_NO_CYCLE_CTA}
              </Link>
            </div>
          ) : data.movements.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <h2 className="text-base font-semibold text-ink">
                {MOVEMENTS_EMPTY_TITLE}
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-mute">
                {MOVEMENTS_EMPTY_BODY}
              </p>
              <Link
                href="/income/register"
                className={cn(buttonVariants({ variant: "outline" }), "mt-6")}
              >
                {MOVEMENTS_EMPTY_CTA}
              </Link>
            </div>
          ) : (
            <ul>
              {data.movements.map((movement, index) => (
                <li
                  key={movement.id}
                  className={
                    index < data.movements.length - 1
                      ? "border-b border-line-divider"
                      : ""
                  }
                >
                  <button
                    type="button"
                    onClick={() => openDetail(movement)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qp md:px-[18px]"
                  >
                    <span
                      className={`size-2 shrink-0 rounded-full ${dotClass(movement)}`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[13.5px] font-semibold text-ink">
                        {movement.kind === "income" ? "Ingreso · " : ""}
                        {movement.label}
                      </span>
                      {movement.isExtraordinaryIncome ? (
                        <span className="ml-1.5 inline-flex rounded-full border border-extraordinary-border bg-extraordinary-surface px-1.5 py-0.5 text-[10px] font-semibold text-extraordinary-b">
                          Extraordinario
                        </span>
                      ) : null}
                      {"envelopeLabel" in movement && movement.envelopeLabel ? (
                        <span className="text-xs text-mute">
                          {" "}
                          · {movement.envelopeLabel}
                        </span>
                      ) : null}
                    </div>
                    <span className="hidden text-xs text-mute sm:inline">
                      {formatLimaDateTime(movement.timestamp)}
                    </span>
                    <span
                      className={`min-w-20 text-right font-serif text-[15px] ${
                        movement.kind === "income" ? "text-qp-deep" : "text-ink"
                      }`}
                    >
                      {movement.kind === "income" ? "+" : "−"}{" "}
                      {formatCents(movement.amount, {
                        currency: data.currencyCode,
                      })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <MovementDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        movement={selectedMovement}
        currencyCode={data.currencyCode}
      />
    </>
  );
}

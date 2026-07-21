"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { buttonVariants } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatLimaDate } from "@/shared/lib/date";
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
import { MovementList } from "@/shared/components/movements/movement-list";

function MovementsViewSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-6 md:px-0 md:py-8">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-4 h-9 w-56" />
      <Skeleton className="mt-2 h-4 w-full max-w-md" />
      <Skeleton className="mt-6 h-64 w-full rounded-[14px]" />
    </div>
  );
}

export function MovementsView() {
  const data = useQuery(api.movements.listForActiveCycle, {});

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
    <div className="mx-auto w-full max-w-2xl px-5 py-6 md:px-0 md:py-8">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-qp-deep hover:underline"
      >
        {MOVEMENTS_BACK_LINK}
      </Link>

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
          <MovementList
            movements={data.movements}
            currencyCode={data.currencyCode}
          />
        )}
      </div>
    </div>
  );
}

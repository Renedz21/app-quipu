import { BillList } from "reicon-react";
import Link from "next/link";
import { MovementList } from "@/shared/components/movements/movement-list";
import {
  MOVEMENTS_EMPTY_BODY,
  MOVEMENTS_SECTION_LABEL,
  MOVEMENTS_VIEW_ALL,
} from "../constants";
import type { DashboardMovement } from "../types";

type Props = {
  movements: DashboardMovement[];
  currencyCode: string;
  isEarlyCycle?: boolean;
};

function MovementsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center md:px-6 md:py-10">
      <span
        className="mb-3 flex size-10 items-center justify-center rounded-full border border-dashed border-line bg-surface-warm text-mute"
        aria-hidden
      >
        <BillList size={20} color="currentColor" />
      </span>
      <p className="max-w-sm text-sm leading-relaxed text-mute">
        {MOVEMENTS_EMPTY_BODY}
      </p>
    </div>
  );
}

export function RecentMovements({
  movements,
  currencyCode,
  isEarlyCycle = false,
}: Props) {
  const showEmptyState = isEarlyCycle || movements.length === 0;

  return (
    <section aria-labelledby="dashboard-movements">
      <div className="mb-2 flex items-center gap-2">
        <h2
          id="dashboard-movements"
          className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute"
        >
          {MOVEMENTS_SECTION_LABEL}
        </h2>
        <div className="h-px flex-1 bg-line-divider" />
        <Link
          href="/movements"
          className="text-[12.5px] font-medium text-qp-deep hover:underline"
        >
          {MOVEMENTS_VIEW_ALL}
        </Link>
      </div>

      <div
        className={`overflow-hidden rounded-[14px] bg-card ${
          showEmptyState
            ? "border border-dashed border-line"
            : "border border-line"
        }`}
      >
        {showEmptyState ? (
          <MovementsEmptyState />
        ) : (
          <MovementList movements={movements} currencyCode={currencyCode} />
        )}
      </div>
    </section>
  );
}

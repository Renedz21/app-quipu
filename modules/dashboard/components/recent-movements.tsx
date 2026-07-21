import { formatLimaDateTime } from "@/shared/lib/date";
import { formatCents } from "@/shared/lib/money";
import {
  MOVEMENTS_EMPTY_BODY,
  MOVEMENTS_SECTION_LABEL,
  MOVEMENTS_VIEW_ALL,
  MOVEMENTS_VIEW_ALL_HINT,
} from "../constants";
import type { DashboardMovement } from "../types";

type Props = {
  movements: DashboardMovement[];
  currencyCode: string;
  isEarlyCycle?: boolean;
};

const MOVEMENT_DOT = {
  expense: {
    needs: "bg-steel",
    wants: "bg-clay",
    default: "bg-mute",
  },
  income: "bg-qp",
} as const;

function movementDotClass(movement: DashboardMovement): string {
  if (movement.kind === "income") return MOVEMENT_DOT.income;
  if (movement.envelopeLabel === "Necesidades")
    return MOVEMENT_DOT.expense.needs;
  if (movement.envelopeLabel === "Gustos") return MOVEMENT_DOT.expense.wants;
  return MOVEMENT_DOT.expense.default;
}

function MovementsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center md:px-6 md:py-10">
      <span
        className="mb-3 flex size-10 items-center justify-center rounded-full border border-dashed border-line bg-surface-warm"
        aria-hidden
      >
        <span className="size-2 rounded-full bg-mute/70" />
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
        <span
          className="text-[12.5px] font-medium text-qp-deep opacity-60"
          aria-disabled
          title={MOVEMENTS_VIEW_ALL_HINT}
        >
          {MOVEMENTS_VIEW_ALL}
        </span>
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
          <ul>
            {movements.map((movement, index) => (
              <li
                key={movement.id}
                className={`flex items-center gap-3 px-4 py-3 md:px-[18px] ${
                  index < movements.length - 1
                    ? "border-b border-line-divider"
                    : ""
                }`}
              >
                <span
                  className={`size-2 shrink-0 rounded-full ${movementDotClass(movement)}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[13.5px] font-semibold text-ink">
                    {movement.kind === "income" ? "Ingreso · " : ""}
                    {movement.label}
                  </span>
                  {movement.envelopeLabel ? (
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
                  {formatCents(movement.amount, { currency: currencyCode })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

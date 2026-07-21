import { formatLimaDateTime } from "@/shared/lib/date";
import { formatCents } from "@/shared/lib/money";

export type MovementItem = {
  id: string;
  kind: "expense" | "income";
  label: string;
  envelopeLabel?: string;
  amount: number;
  timestamp: number;
};

const MOVEMENT_DOT = {
  expense: {
    needs: "bg-steel",
    wants: "bg-clay",
    default: "bg-mute",
  },
  income: "bg-qp",
} as const;

function movementDotClass(movement: MovementItem): string {
  if (movement.kind === "income") return MOVEMENT_DOT.income;
  if (movement.envelopeLabel === "Necesidades")
    return MOVEMENT_DOT.expense.needs;
  if (movement.envelopeLabel === "Gustos") return MOVEMENT_DOT.expense.wants;
  return MOVEMENT_DOT.expense.default;
}

type Props = {
  movements: MovementItem[];
  currencyCode: string;
};

export function MovementList({ movements, currencyCode }: Props) {
  return (
    <ul>
      {movements.map((movement, index) => (
        <li
          key={movement.id}
          className={`flex items-center gap-3 px-4 py-3 md:px-[18px] ${
            index < movements.length - 1 ? "border-b border-line-divider" : ""
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
  );
}

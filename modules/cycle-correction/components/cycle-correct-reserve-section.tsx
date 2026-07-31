import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { formatCents } from "@/shared/lib/money";
import type { CycleCorrectFormAction } from "../lib/cycle-correct-form-state";

type CommitmentOption = {
  id: string;
  name: string;
  amount: number;
};

type Props = {
  commitments: CommitmentOption[];
  selectedCommitmentId: string;
  reserveText: string;
  currencyCode: string;
  dispatch: (action: CycleCorrectFormAction) => void;
};

export function CycleCorrectReserveSection({
  commitments,
  selectedCommitmentId,
  reserveText,
  currencyCode,
  dispatch,
}: Props) {
  return (
    <div className="rounded-[14px] border border-line bg-card p-4">
      <Label htmlFor="cycle-correct-commitment" className="text-[13px]">
        Reservar para un compromiso
      </Label>
      <select
        id="cycle-correct-commitment"
        aria-label="Compromiso a reservar"
        className="mt-2 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm"
        value={selectedCommitmentId}
        onChange={(event) =>
          dispatch({
            type: "setField",
            field: "selectedCommitmentId",
            value: event.target.value,
          })
        }
      >
        <option value="">Sin reserva nueva</option>
        {commitments.map((commitment) => (
          <option key={commitment.id} value={commitment.id}>
            {commitment.name} ·{" "}
            {formatCents(commitment.amount, { currency: currencyCode })}
          </option>
        ))}
      </select>
      <Input
        className="mt-2"
        inputMode="decimal"
        placeholder="0.00"
        aria-label="Monto a reservar"
        value={reserveText}
        onChange={(event) =>
          dispatch({
            type: "setField",
            field: "reserveText",
            value: event.target.value,
          })
        }
      />
    </div>
  );
}

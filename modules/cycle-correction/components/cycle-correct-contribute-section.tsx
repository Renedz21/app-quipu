import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import type { CycleCorrectFormAction } from "../lib/cycle-correct-form-state";

type Props = {
  contributeKind: "objective" | "additional";
  contributeText: string;
  dispatch: (action: CycleCorrectFormAction) => void;
};

export function CycleCorrectContributeSection({
  contributeKind,
  contributeText,
  dispatch,
}: Props) {
  return (
    <div className="rounded-[14px] border border-line bg-card p-4">
      <Label className="text-[13px]">Aportar al Fondo ahora</Label>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className={`rounded-md border px-3 py-1.5 text-[12.5px] ${
            contributeKind === "objective"
              ? "border-qp bg-qp-panel text-qp-deep"
              : "border-line"
          }`}
          onClick={() =>
            dispatch({ type: "setContributeKind", kind: "objective" })
          }
        >
          Hacia la meta
        </button>
        <button
          type="button"
          className={`rounded-md border px-3 py-1.5 text-[12.5px] ${
            contributeKind === "additional"
              ? "border-qp bg-qp-panel text-qp-deep"
              : "border-line"
          }`}
          onClick={() =>
            dispatch({ type: "setContributeKind", kind: "additional" })
          }
        >
          Adicional
        </button>
      </div>
      <Input
        className="mt-2"
        inputMode="decimal"
        placeholder="0.00"
        aria-label="Monto a aportar al Fondo"
        value={contributeText}
        onChange={(event) =>
          dispatch({
            type: "setField",
            field: "contributeText",
            value: event.target.value,
          })
        }
      />
    </div>
  );
}

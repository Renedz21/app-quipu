import { formatCents } from "@/shared/lib/money";
import type { CycleCorrectFormAction } from "../lib/cycle-correct-form-state";
import { CycleCorrectMoneyField } from "./cycle-correct-money-field";

type Props = {
  needsText: string;
  wantsText: string;
  savingsText: string;
  unallocatedText: string;
  needsRemainingCents?: number;
  currencyCode: string;
  dispatch: (action: CycleCorrectFormAction) => void;
};

export function CycleCorrectEnvelopeFields({
  needsText,
  wantsText,
  savingsText,
  unallocatedText,
  needsRemainingCents,
  currencyCode,
  dispatch,
}: Props) {
  return (
    <>
      <CycleCorrectMoneyField
        id="cycle-correct-needs"
        label="Disponible en Necesidades"
        value={needsText}
        onChange={(value) =>
          dispatch({ type: "setField", field: "needsText", value })
        }
        hint={
          needsRemainingCents !== undefined
            ? `Ahora: ${formatCents(needsRemainingCents, { currency: currencyCode })}`
            : undefined
        }
      />
      <CycleCorrectMoneyField
        id="cycle-correct-wants"
        label="Disponible en Gustos"
        value={wantsText}
        onChange={(value) =>
          dispatch({ type: "setField", field: "wantsText", value })
        }
      />
      <CycleCorrectMoneyField
        id="cycle-correct-savings"
        label="En sobre Ahorro (aún no en Fondo)"
        value={savingsText}
        onChange={(value) =>
          dispatch({ type: "setField", field: "savingsText", value })
        }
      />
      <CycleCorrectMoneyField
        id="cycle-correct-unallocated"
        label="Por repartir"
        value={unallocatedText}
        onChange={(value) =>
          dispatch({ type: "setField", field: "unallocatedText", value })
        }
      />
    </>
  );
}

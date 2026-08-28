"use client";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { parseToCents } from "@/shared/lib/money";

type Props = {
  amountText: string;
  currencyCode: string;
  onAmountChange: (value: string) => void;
  onNext: () => void;
};

export function WizardStepIncome({
  amountText,
  currencyCode,
  onAmountChange,
  onNext,
}: Props) {
  const cents = parseToCents(amountText);
  const valid = cents != null && cents > 0;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-xl text-ink">
          ¿Cuánto dinero entró realmente este ciclo?
        </h2>
        <p className="mt-1 text-sm text-mute">
          El monto total que recibiste, sin restar nada.
        </p>
      </div>
      <Input
        aria-label="Monto que ingresó este ciclo"
        className="h-14 text-center font-serif text-2xl"
        inputMode="decimal"
        placeholder="0.00"
        value={amountText}
        onChange={(event) => onAmountChange(event.target.value)}
      />
      <p className="text-[12px] text-mute">Moneda: {currencyCode}</p>
      <Button className="w-full" disabled={!valid} onClick={onNext}>
        Continuar
      </Button>
    </div>
  );
}

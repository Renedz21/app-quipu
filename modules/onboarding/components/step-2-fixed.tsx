"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { OnboardingShell } from "./onboarding-shell";
import { useOnboarding } from "./onboarding-provider";
import { CheckMark } from "./check-mark";
import { DAY_PILLS } from "../constants";
import { formatCycle } from "../lib/cycle";

type Props = { onBack: () => void; onNext: () => void };

const FREQ_LABEL: Record<"monthly" | "biweekly", string> = {
  monthly: "Mensual",
  biweekly: "Quincenal",
};

const FREQ_DESC: Record<"monthly" | "biweekly", string> = {
  monthly: "Un pago al mes",
  biweekly: "Dos pagos al mes",
};

export function Step2Fixed({ onBack, onNext }: Props) {
  const { state, dispatch } = useOnboarding();
  const isBiweekly = state.payFrequency === "biweekly";
  const cycleDays = isBiweekly ? 15 : 30;
  const payday = state.paydays?.[0] ?? 1;
  const canContinue = !!state.payFrequency && state.paydays.length > 0;

  function selectDay(day: number) {
    if (isBiweekly) {
      const other = state.paydays?.find((pd) => pd !== payday) ?? 15;
      if (day === other) return;
      dispatch({ type: "UPDATE", payload: { paydays: [day, other] } });
    } else {
      dispatch({ type: "UPDATE", payload: { paydays: [day] } });
    }
  }

  return (
    <OnboardingShell
      currentStep={2}
      title="¿Cada cuánto te pagan?"
      subtitle="Tu ciclo empieza el día que recibes tu sueldo."
      onBack={onBack}
      cta={
        <Button onClick={onNext} disabled={!canContinue} size="lg">
          Continuar →
        </Button>
      }
    >
      <div className="flex gap-3">
        {(["monthly", "biweekly"] as const).map((freq) => {
          const selected = state.payFrequency === freq;
          return (
            <button
              key={freq}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() =>
                dispatch({
                  type: "UPDATE",
                  payload: {
                    payFrequency: freq,
                    paydays: freq === "biweekly" ? [1, 15] : [1],
                  },
                })
              }
              className={cn(
                "flex flex-1 items-center justify-between rounded-xl border-2 p-5 text-left",
                selected
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-card hover:border-primary/50",
              )}
            >
              <div>
                <p className="font-semibold">{FREQ_LABEL[freq]}</p>
                <p className="mt-1 text-sm text-muted-foreground">{FREQ_DESC[freq]}</p>
              </div>
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full",
                  selected ? "bg-primary" : "border-2 border-border",
                )}
              >
                {selected && <CheckMark size={12} />}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-sm font-medium">Día de pago</p>
      <div className="flex flex-wrap gap-2">
        {DAY_PILLS.map((d) => {
          const day = d === "Ultimo" ? 31 : d;
          const selected = state.paydays?.includes(day);
          return (
            <button
              key={d}
              type="button"
              onClick={() => selectDay(day)}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm",
                selected
                  ? "border-primary bg-primary-soft font-semibold text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50",
              )}
            >
              {d}
            </button>
          );
        })}
      </div>

      {state.paydays && state.paydays.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-soft p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tu ciclo
          </span>
          <span className="font-serif text-base text-foreground">
            {formatCycle(payday)}
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-sm text-primary">
            <span className="size-2 rounded-full bg-primary" />
            {cycleDays} días
          </span>
        </div>
      )}
    </OnboardingShell>
  );
}

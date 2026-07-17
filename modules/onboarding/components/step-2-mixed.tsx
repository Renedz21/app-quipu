"use client";

import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { DAY_PILLS } from "../constants";
import { useOnboarding } from "./onboarding-provider";
import { OnboardingShell } from "./onboarding-shell";

type Props = { onBack: VoidFunction; onNext: VoidFunction };

export function Step2Mixed({ onBack, onNext }: Props) {
  const { state, dispatch } = useOnboarding();
  const mixedDay = state.paydays?.[0] ?? 1;
  const displayAmount =
    state.mixedFixedAmount != null
      ? (state.mixedFixedAmount / 100).toFixed(2)
      : "";

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
      .replace(/[^0-9.]/g, "")
      .replace(/^0+(?=\d)/, "");
    const num = Number.parseFloat(raw);
    dispatch({
      type: "UPDATE",
      payload: {
        mixedFixedAmount: Number.isNaN(num) ? null : Math.round(num * 100),
      },
    });
  }

  return (
    <OnboardingShell
      currentStep={2}
      title="Combinemos lo fijo y lo variable"
      subtitle="Configura tu parte previsible; el resto entra cuando lo registres."
      onBack={onBack}
      cta={
        <Button onClick={onNext} size="lg">
          Continuar →
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="size-3 rounded-full bg-needs" />
            <p className="font-semibold">Ingreso previsible</p>
            <span className="text-xs text-muted-foreground">
              · sueldo, mensualidad
            </span>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 rounded-lg border border-border bg-surface p-3">
              <label className="text-xs text-muted-foreground">
                ¿Cuánto recibes normalmente cada mes?
              </label>
              <div className="relative mt-1">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 font-serif text-xl text-muted-foreground">
                  S/
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={displayAmount}
                  onChange={handleAmountChange}
                  placeholder="—"
                  className="border-none bg-transparent p-0 pl-7 font-serif text-xl text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
                />
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Es una estimación. Podrás cambiarla después.
              </p>
            </div>
            <div className="flex-1 rounded-lg border border-border bg-surface p-3">
              <p className="text-xs text-muted-foreground">Día de pago</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {DAY_PILLS.map((day) => (
                  <DayPill
                    key={day}
                    label={`Día ${day}`}
                    selected={mixedDay === day}
                    onClick={() =>
                      dispatch({ type: "UPDATE", payload: { paydays: [day] } })
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="size-3 rounded-full bg-clay" />
            <p className="font-semibold">Ingresos variables</p>
            <span className="text-xs text-muted-foreground">
              · proyectos, ventas
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Proyectos", "Ventas", "Servicios"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            <span className="rounded-full border border-dashed border-border bg-surface-soft px-3 py-1.5 text-sm text-muted-foreground">
              + Agregar
            </span>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}

function DayPill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: VoidFunction;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-sm",
        selected
          ? "border-primary bg-primary-soft font-semibold text-primary"
          : "border-border text-muted-foreground hover:border-primary/50",
      )}
    >
      {label}
    </button>
  );
}

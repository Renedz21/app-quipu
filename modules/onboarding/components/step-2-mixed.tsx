"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { OnboardingShell } from "./onboarding-shell";
import { useOnboarding } from "./onboarding-provider";
import { DAY_PILLS } from "../constants";

type Props = { onBack: () => void; onNext: () => void };

export function Step2Mixed({ onBack, onNext }: Props) {
  const { state, dispatch } = useOnboarding();
  const mixedDay = state.paydays?.[0] ?? 1;

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
              <p className="text-xs text-muted-foreground">Monto</p>
              <p className="font-serif text-xl text-foreground">S/ —</p>
            </div>
            <div className="flex-1 rounded-lg border border-border bg-surface p-3">
              <p className="text-xs text-muted-foreground">Día de pago</p>
              <div className="flex flex-wrap gap-1.5">
                {DAY_PILLS.map((d) => {
                  const day = d === "Ultimo" ? 31 : d;
                  const label = String(d);
                  return (
                    <DayPill
                      key={label}
                      label={label}
                      selected={mixedDay === day}
                      onClick={() =>
                        dispatch({ type: "UPDATE", payload: { paydays: [day] } })
                      }
                    />
                  );
                })}
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
  onClick: () => void;
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

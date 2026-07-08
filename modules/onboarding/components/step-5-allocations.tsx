/**
 * Paso 5: Porcentajes de reparto.
 *
 * UI (spec §3 paso 5 + frame 5):
 * - Pill superior: "Recomiendan: 50 / 30 / 20".
 * - Barra segmentada con 3 colores (needs / wants / savings).
 * - 3 filas con: ícono + label + slider + valor editable.
 * - Al mover un slider, los otros 2 se ajustan proporcionalmente
 *   para mantener suma 100.
 * - Banner de error si no suma 100 (botón Continuar deshabilitado).
 *
 * Defaults: 50 / 30 / 20 desde el reducer. El usuario puede cambiarlos.
 */

"use client";

import { ArrowRight, Gift } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useOnboarding } from "./onboarding-provider";
import { step5Schema } from "../schemas";
import { computeAllocation } from "../lib/allocations";

interface Step5AllocationsProps {
  onAdvance: () => void;
}

type Envelope = "needs" | "wants" | "savings";

const ENVELOPES: Array<{
  key: Envelope;
  label: string;
  varName: "allocationNeeds" | "allocationWants" | "allocationSavings";
}> = [
  { key: "needs", label: "Necesidades", varName: "allocationNeeds" },
  { key: "wants", label: "Gustos", varName: "allocationWants" },
  { key: "savings", label: "Ahorro", varName: "allocationSavings" },
];

export function Step5Allocations({ onAdvance }: Step5AllocationsProps) {
  const { state, update } = useOnboarding();
  const [touched, setTouched] = useState(false);

  const total =
    state.allocationNeeds + state.allocationWants + state.allocationSavings;

  const validation = step5Schema.safeParse({
    allocationNeeds: state.allocationNeeds,
    allocationWants: state.allocationWants,
    allocationSavings: state.allocationSavings,
  });
  const error = !validation.success
    ? "El reparto debe sumar exactamente 100%."
    : null;
  const showError = touched && error;
  const canContinue = validation.success;

  const setAllocation = (key: Envelope, newValue: number) => {
    const rounded = computeAllocation(key, newValue, {
      needs: state.allocationNeeds,
      wants: state.allocationWants,
      savings: state.allocationSavings,
    });
    update({
      allocationNeeds: rounded.needs,
      allocationWants: rounded.wants,
      allocationSavings: rounded.savings,
    });
  };

  const handleAdvance = () => {
    setTouched(true);
    if (validation.success) onAdvance();
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1
        className="font-heading text-2xl font-semibold"
        data-step-heading
        tabIndex={-1}
      >
        ¿Cómo repartimos tu dinero?
      </h1>

      {/* Pill superior */}
      <div className="flex items-center gap-1.5 self-start rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success">
        <Gift className="size-3" aria-hidden />
        Recomiendan: 50 / 30 / 20
      </div>

      {/* Barra segmentada */}
      <div
        className="flex h-2 w-full overflow-hidden rounded-full"
        role="img"
        aria-label={`Reparto actual: Necesidades ${state.allocationNeeds}%, Gustos ${state.allocationWants}%, Ahorro ${state.allocationSavings}%`}
      >
        <div
          className="bg-needs transition-all"
          style={{ width: `${state.allocationNeeds}%` }}
        />
        <div
          className="bg-wants transition-all"
          style={{ width: `${state.allocationWants}%` }}
        />
        <div
          className="bg-savings transition-all"
          style={{ width: `${state.allocationSavings}%` }}
        />
      </div>

      {/* Banner de error */}
      {showError && (
        <div
          className="flex items-start gap-2 rounded-xl bg-destructive-soft px-3 py-2.5 text-sm text-foreground"
          role="alert"
        >
          <span className="font-semibold text-destructive">{error}</span>
        </div>
      )}

      {/* 3 filas */}
      <div className="flex flex-col gap-4">
        {ENVELOPES.map(({ key, label, varName }) => {
          const value = state[varName];
          return (
            <AllocationRow
              key={key}
              label={label}
              value={value}
              onChange={(n) => setAllocation(key, n)}
            />
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">Suma actual: {total}%</p>

      <div className="mt-auto pt-4">
        <Button
          type="button"
          size="lg"
          onClick={handleAdvance}
          disabled={!canContinue}
          className="h-12 w-full text-sm font-semibold"
        >
          Continuar
          <ArrowRight className="size-4" data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

function AllocationRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              if (Number.isFinite(n)) onChange(n);
            }}
            className="h-8 w-16 text-right"
            aria-label={`${label} porcentaje`}
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number.parseInt(e.target.value, 10))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
        aria-label={`${label} slider`}
      />
    </div>
  );
}

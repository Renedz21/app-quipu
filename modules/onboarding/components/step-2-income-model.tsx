/**
 * Paso 2: Modelo de ingresos.
 *
 * UI (spec §3 paso 2):
 * - Heading "¿Cómo son tus ingresos?".
 * - 3 cards (Fijos / Variables / Mixtos) con ícono + título + subtítulo.
 * - Banner info (warning-soft): "Variables y mixtos activan cobertura
 *   progresiva: primero lo esencial."
 * - CTA "Continuar" deshabilitado hasta seleccionar uno.
 *
 * Validación: enum ("fixed" | "variable" | "mixed"). El botón se
 * habilita solo si hay selección.
 */

"use client";

import { ArrowRight, Info } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useOnboarding } from "./onboarding-provider";
import { IncomeModelCard } from "./income-model-card";
import { INCOME_MODEL_LABELS } from "../constants";
import { Activity, Calendar, Layers } from "lucide-react";
import type { IncomeModel } from "../types";

const ICONS: Record<IncomeModel, typeof Calendar> = {
  fixed: Calendar,
  variable: Activity,
  mixed: Layers,
};

const MODELS: IncomeModel[] = ["fixed", "variable", "mixed"];

interface Step2IncomeModelProps {
  onAdvance: () => void;
}

export function Step2IncomeModel({ onAdvance }: Step2IncomeModelProps) {
  const { state, update } = useOnboarding();

  const handleSelect = (value: IncomeModel) => {
    update({ incomeModel: value });
  };

  const canContinue = state.incomeModel !== null;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1
        className="font-heading text-2xl font-semibold"
        data-step-heading
        tabIndex={-1}
      >
        ¿Cómo son tus ingresos?
      </h1>
      <p className="-mt-4 text-sm text-muted-foreground">
        Define cómo armamos tu ciclo. Puedes cambiarlo luego.
      </p>

      <div className="flex flex-col gap-3">
        {MODELS.map((model) => {
          const labels = INCOME_MODEL_LABELS[model];
          const Icon = ICONS[model];
          return (
            <IncomeModelCard
              key={model}
              title={labels.title}
              subtitle={labels.subtitle}
              icon={Icon}
              selected={state.incomeModel === model}
              onSelect={() => handleSelect(model)}
            />
          );
        })}
      </div>

      <div
        className="flex items-start gap-2 rounded-xl bg-warning-soft px-3 py-2.5 text-xs text-foreground"
        role="note"
      >
        <Info className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
        <p>
          Variables y mixtos activan{" "}
          <strong className="font-semibold">cobertura progresiva</strong>:
          primero lo esencial.
        </p>
      </div>

      <div className="mt-auto pt-4">
        <Button
          type="button"
          size="lg"
          onClick={onAdvance}
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

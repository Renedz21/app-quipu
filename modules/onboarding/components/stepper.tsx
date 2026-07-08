/**
 * Stepper visual del wizard (8 nodos).
 *
 * Server-friendly: no tiene estado ni efectos. Solo recibe `currentStep`
 * y renderiza los 8 nodos con su estado visual.
 *
 * Estados de un nodo:
 * - `done`: paso anterior al actual. Check verde.
 * - `active`: paso actual. Relleno `--primary`.
 * - `empty`: paso futuro. Vacío con borde.
 *
 * Accesibilidad (spec §9):
 * - Wrapper: `aria-label="Progreso del wizard, paso {N} de 8"`.
 * - Cada nodo: `aria-current="step"` si es el activo.
 */

import { Check } from "lucide-react";
import { STEP_COUNT } from "../constants";
import type { OnboardingStep } from "../types";
import { cn } from "@/shared/lib/utils";

interface StepperProps {
  currentStep: OnboardingStep;
}

export function Stepper({ currentStep }: StepperProps) {
  const steps = Array.from({ length: STEP_COUNT }, (_, i) => i + 1) as OnboardingStep[];

  return (
    <nav
      aria-label={`Progreso del wizard, paso ${currentStep} de ${STEP_COUNT}`}
      className="flex items-center gap-2"
    >
      {steps.map((step, index) => {
        const isActive = step === currentStep;
        const isDone = step < currentStep;
        const isEmpty = step > currentStep;

        return (
          <div
            key={step}
            className="flex items-center gap-2"
            data-step={step}
            data-state={isActive ? "active" : isDone ? "done" : "empty"}
          >
            {/* Nodo */}
            <div
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "flex size-6 items-center justify-center rounded-full border-2 text-[10px] font-semibold transition-colors",
                isActive && "border-primary bg-primary text-primary-foreground",
                isDone && "border-success bg-success text-success-foreground",
                isEmpty && "border-border bg-background text-muted-foreground",
              )}
            >
              {isDone ? <Check className="size-3" /> : step}
            </div>
            {/* Track conector (no después del último nodo) */}
            {index < steps.length - 1 && (
              <div
                aria-hidden
                className={cn(
                  "h-0.5 w-8 transition-colors",
                  isDone ? "bg-success" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

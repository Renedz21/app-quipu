/**
 * Placeholder para los steps 3-7.
 *
 * El slice 1 solo implementa los pasos 1 y 2. Los pasos 3-7 muestran
 * este placeholder con un botón "Continuar" que avanza al siguiente.
 * El step 8 es solo display (sin botón).
 *
 * Cuando cada slice implemente su step real, este placeholder se
 * reemplaza importando el componente real en `onboarding-wizard.tsx`.
 */

import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import type { OnboardingStep } from "../types";

interface StepPlaceholderProps {
  step: OnboardingStep;
  title: string;
  description: string;
  onAdvance?: () => void;
  /** Etiqueta del CTA. Default: "Continuar". */
  ctaLabel?: string;
}

export function StepPlaceholder({
  step,
  title,
  description,
  onAdvance,
  ctaLabel = "Continuar",
}: StepPlaceholderProps) {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center gap-2">
        <span
          className="flex size-7 items-center justify-center rounded-full bg-primary-soft font-heading text-sm font-semibold text-primary"
          aria-hidden
        >
          {step}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Paso {step} de 8
        </span>
      </div>
      <h1
        className="font-heading text-2xl font-semibold"
        data-step-heading
        tabIndex={-1}
      >
        {title}
      </h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div
        className={cn(
          "rounded-xl border-2 border-dashed border-border bg-paper/50 p-6 text-center text-sm text-muted-foreground",
        )}
      >
        Implementación pendiente en slice posterior.
      </div>
      {onAdvance && (
        <div className="mt-auto pt-4">
          <Button
            type="button"
            size="lg"
            onClick={onAdvance}
            className="h-12 w-full text-sm font-semibold"
          >
            {ctaLabel}
            <ArrowRight className="size-4" data-icon="inline-end" />
          </Button>
        </div>
      )}
    </div>
  );
}

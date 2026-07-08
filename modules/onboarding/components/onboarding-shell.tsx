/**
 * Shell del wizard: stepper arriba + container del step.
 *
 * Server-friendly. Acepta `currentStep` y `children`. El `<main>` tiene
 * `min-h-svh` para que el wizard ocupe la pantalla completa, mobile-first
 * (max-w-md centrado).
 *
 * El `data-step-heading` se setea en el step component (no en el shell)
 * para que el foco se mueva al h1 al cambiar de step (ver
 * `OnboardingWizard`).
 */

import type { ReactNode } from "react";
import { Stepper } from "./stepper";
import type { OnboardingStep } from "../types";

interface OnboardingShellProps {
  currentStep: OnboardingStep;
  children: ReactNode;
}

export function OnboardingShell({
  currentStep,
  children,
}: OnboardingShellProps) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-paper px-4 py-8">
      <div className="flex justify-center items-center w-full  flex-1 flex-col gap-8">
        <header className="flex items-center justify-between">
          <Stepper currentStep={currentStep} />
          <span className="text-xs text-muted-foreground" aria-hidden>
            Paso {currentStep} de 8
          </span>
        </header>
        <main className="flex flex-col">{children}</main>
      </div>
    </div>
  );
}

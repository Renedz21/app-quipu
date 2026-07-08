/**
 * Wizard de onboarding (orquestador).
 *
 * Recibe `initialStep` del server (vía `/configurar/page.tsx`),
 * monta el `OnboardingProvider` (state + sessionStorage), y según
 * `state.currentStep` renderiza el step correspondiente.
 *
 * Steps implementados en slice 1:
 * - 1: Bienvenida del copiloto (captura nombre).
 * - 2: Modelo de ingresos.
 * - 3-8: placeholders o futuros componentes.
 *
 * El provider hace que cada step component pueda leer/escribir el
 * state sin prop drilling.
 *
 * Responsabilidad de este componente:
 * - Mapear `currentStep` → componente.
 * - Proveer el Context.
 * - NO tocar el state directamente (lo hace cada step component).
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnboardingProvider, useOnboarding } from "./onboarding-provider";
import { OnboardingShell } from "./onboarding-shell";
import { Step1Welcome } from "./step-1-welcome";
import { Step2IncomeModel } from "./step-2-income-model";
import { Step3Frequency } from "./step-3-frequency";
import { Step4CyclePreview } from "./step-4-cycle-preview";
import { StepPlaceholder } from "./step-placeholder";
import type { OnboardingStep } from "../types";

interface OnboardingWizardProps {
  initialStep: OnboardingStep;
}

export function OnboardingWizard({ initialStep }: OnboardingWizardProps) {
  return (
    <OnboardingProvider initialStep={initialStep}>
      <WizardInner />
    </OnboardingProvider>
  );
}

/**
 * Inner: lee `state.currentStep` y renderiza el step. Separado del
 * outer para poder usar `useOnboarding` (que requiere estar dentro
 * del Provider).
 */
function WizardInner() {
  const { state, setStep } = useOnboarding();
  const router = useRouter();

  // Sincronizar `?step=` con `state.currentStep`. Esto permite que el
  // usuario navegue con flecha atrás del browser, y que la URL sea
  // compartible. El replace (no push) evita llenar el history stack
  // cuando el state cambia por interacción normal.
  useEffect(() => {
    const url = new URL(window.location.href);
    const urlStep = Number.parseInt(url.searchParams.get("step") ?? "1", 10);
    if (urlStep !== state.currentStep) {
      url.searchParams.set("step", String(state.currentStep));
      router.replace(`${url.pathname}?${url.searchParams.toString()}`);
    }
  }, [state.currentStep, router]);

  // Mover foco al h1 del step al cambiar (a11y, spec §9).
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-ejecutar al cambiar el step.
  useEffect(() => {
    const h1 = document.querySelector("[data-step-heading]");
    if (h1 instanceof HTMLElement) {
      h1.focus();
    }
  }, [state.currentStep]);

  const stepContent = (() => {
    switch (state.currentStep) {
      case 1:
        return <Step1Welcome onAdvance={() => setStep(2)} />;
      case 2:
        return <Step2IncomeModel onAdvance={() => setStep(3)} />;
      case 3:
        return <Step3Frequency onAdvance={() => setStep(4)} />;
      case 4:
        return <Step4CyclePreview onAdvance={() => setStep(5)} />;
      case 5:
        return (
          <StepPlaceholder
            step={5}
            title="¿Cómo repartimos tu dinero?"
            description="Necesidades, Gustos y Ahorro. Recomendamos 50/30/20."
            onAdvance={() => setStep(6)}
          />
        );
      case 6:
        return (
          <StepPlaceholder
            step={6}
            title="¿Tienes gastos fijos?"
            description="Los apartamos de Necesidades antes de repartir el resto."
            onAdvance={() => setStep(7)}
          />
        );
      case 7:
        return (
          <StepPlaceholder
            step={7}
            title="Así se verá tu Quipu"
            description="Un preview del dashboard con tus sobres vacíos, listos para el primer ingreso."
            ctaLabel="Activar mi copiloto"
            onAdvance={() => setStep(8)}
          />
        );
      case 8:
        return (
          <StepPlaceholder
            step={8}
            title="¡Tu Quipu está listo!"
            description="Resumen final tras crear el perfil."
          />
        );
    }
  })();

  return <OnboardingShell currentStep={state.currentStep}>{stepContent}</OnboardingShell>;
}

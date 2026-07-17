"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { OnboardingProvider, useOnboarding } from "./onboarding-provider";
import { Step1IncomeProfile } from "./step-1-income-profile";
import { Step2SystemConfig } from "./step-2-system-config";
import { Step3Allocation } from "./step-3-allocation";

function WizardInner() {
  const { state, dispatch } = useOnboarding();
  const searchParams = useSearchParams();
  const hydrated = useRef(false);

  useEffect(() => {
    const stepParam = searchParams.get("step");
    if (stepParam && !hydrated.current) {
      const n = Number.parseInt(stepParam, 10);
      if (n >= 1 && n <= 3) {
        dispatch({ type: "SET_STEP", payload: n as 1 | 2 | 3 });
      }
    }
    hydrated.current = true;
  }, [searchParams, dispatch]);

  useEffect(() => {
    if (hydrated.current) {
      window.history.replaceState(null, "", `/configurar?step=${state.currentStep}`);
    }
  }, [state.currentStep]);

  switch (state.currentStep) {
    case 1:
      return <Step1IncomeProfile />;
    case 2:
      return <Step2SystemConfig />;
    case 3:
      return <Step3Allocation />;
    default:
      return <Step1IncomeProfile />;
  }
}

export function OnboardingWizard() {
  return (
    <OnboardingProvider>
      <WizardInner />
    </OnboardingProvider>
  );
}

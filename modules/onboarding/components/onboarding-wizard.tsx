"use client";

import { useEffect, useState } from "react";
import { useOnboardingTracking } from "@/hooks/use-onboarding-tracking";
import { OnboardingProvider } from "./onboarding-provider";
import { Step1IncomeProfile } from "./step-1-income-profile";
import { Step2SystemConfig } from "./step-2-system-config";
import { Step3Allocation } from "./step-3-allocation";
import { StepSuccess } from "./step-success";

type Step = 1 | 2 | 3 | "success";

const ONBOARDING_STARTED_KEY = "qp:onboarding:started_at";

function stampOnboardingStart(): void {
  if (typeof window === "undefined") return;
  try {
    const existing = window.sessionStorage.getItem(ONBOARDING_STARTED_KEY);
    if (existing) return;
    window.sessionStorage.setItem(ONBOARDING_STARTED_KEY, String(Date.now()));
  } catch {
    // sessionStorage no disponible; tracking funciona sin duración
  }
}

export function OnboardingWizard() {
  const [step, setStep] = useState<Step>(1);
  const { markStepCompleted } = useOnboardingTracking(step);

  useEffect(() => {
    stampOnboardingStart();
  }, []);

  return (
    <OnboardingProvider>
      {step === 1 && (
        <Step1IncomeProfile
          onNext={() => setStep(2)}
          onStepCompleted={() => markStepCompleted(1)}
        />
      )}
      {step === 2 && (
        <Step2SystemConfig
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
          onStepCompleted={() => markStepCompleted(2)}
        />
      )}
      {step === 3 && (
        <Step3Allocation
          onBack={() => setStep(2)}
          onComplete={() => setStep("success")}
          onStepCompleted={() => markStepCompleted(3)}
        />
      )}
      {step === "success" && <StepSuccess />}
    </OnboardingProvider>
  );
}

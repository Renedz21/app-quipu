"use client";

import { useState } from "react";
import { OnboardingProvider } from "./onboarding-provider";
import { Step1IncomeProfile } from "./step-1-income-profile";
import { Step2SystemConfig } from "./step-2-system-config";
import { Step3Allocation } from "./step-3-allocation";
import { StepSuccess } from "./step-success";

type Step = 1 | 2 | 3 | "success";

export function OnboardingWizard() {
  const [step, setStep] = useState<Step>(1);

  return (
    <OnboardingProvider>
      {step === 1 && <Step1IncomeProfile onNext={() => setStep(2)} />}
      {step === 2 && (
        <Step2SystemConfig
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <Step3Allocation
          onBack={() => setStep(2)}
          onComplete={() => setStep("success")}
        />
      )}
      {step === "success" && <StepSuccess />}
    </OnboardingProvider>
  );
}

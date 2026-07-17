"use client";

import { useState } from "react";
import { OnboardingProvider } from "./onboarding-provider";
import { Step1IncomeProfile } from "./step-1-income-profile";
import { Step2SystemConfig } from "./step-2-system-config";
import { Step3Allocation } from "./step-3-allocation";
import { StepSuccess } from "./step-success";

type Step = 1 | 2 | 3 | "success";

export function OnboardingWizard() {
  return (
    <OnboardingProvider>
      <WizardInner />
    </OnboardingProvider>
  );
}

function WizardInner() {
  const [step, setStep] = useState<Step>(1);

  function handleNext() {
    setStep((s) => (s === 1 ? 2 : s === 2 ? 3 : s));
  }

  function handleBack() {
    setStep((s) => (s === 2 ? 1 : s === 3 ? 2 : s));
  }

  function handleComplete() {
    setStep("success");
  }

  if (step === "success") return <StepSuccess />;

  switch (step) {
    case 1:
      return <Step1IncomeProfile onNext={handleNext} />;
    case 2:
      return <Step2SystemConfig onBack={handleBack} onNext={handleNext} />;
    case 3:
      return <Step3Allocation onBack={handleBack} onComplete={handleComplete} />;
    default:
      return <Step1IncomeProfile onNext={handleNext} />;
  }
}

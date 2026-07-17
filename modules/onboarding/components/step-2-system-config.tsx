"use client";

import { useOnboarding } from "./onboarding-provider";
import { Step2Fixed } from "./step-2-fixed";
import { Step2Mixed } from "./step-2-mixed";
import { Step2Variable } from "./step-2-variable";

type Props = { onBack: VoidFunction; onNext: VoidFunction };

export function Step2SystemConfig({ onBack, onNext }: Props) {
  const { state } = useOnboarding();

  switch (state.incomeModel) {
    case "variable":
      return <Step2Variable onBack={onBack} onNext={onNext} />;
    case "mixed":
      return <Step2Mixed onBack={onBack} onNext={onNext} />;
    default:
      return <Step2Fixed onBack={onBack} onNext={onNext} />;
  }
}

import type { OnboardingState } from "./types";

export const STEP_COUNT = 3;
export const STEP_LABELS = ["Perfil", "Sistema", "Reparto"] as const;

export const ONBOARDING_DEFAULTS: OnboardingState = {
  currentStep: 1,
  incomeModel: null,
  payFrequency: null,
  paydays: [],
  cycleDurationDays: null,
  allocationNeeds: 50,
  allocationWants: 30,
  allocationSavings: 20,
  country: "Perú",
  currencyCode: "PEN",
  currencySymbol: "S/",
};

export const STORAGE_KEY = "quipu-onboarding-state";

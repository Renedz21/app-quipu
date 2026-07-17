export type IncomeModel = "fixed" | "variable" | "mixed";
export type PayFrequency = "monthly" | "biweekly";
export type CycleDuration = 15 | 30;

export type OnboardingState = {
  currentStep: 1 | 2 | 3;
  incomeModel: IncomeModel | null;
  payFrequency: PayFrequency | null;
  paydays: number[];
  cycleDurationDays: CycleDuration | null;
  mixedFixedAmount: number | null;
  allocationNeeds: number;
  allocationWants: number;
  allocationSavings: number;
  country: string;
  currencyCode: string;
  currencySymbol: string;
};

export type OnboardingAction =
  | { type: "UPDATE"; payload: Partial<OnboardingState> }
  | { type: "SET_STEP"; payload: OnboardingState["currentStep"] }
  | { type: "RESET" }
  | { type: "HYDRATE"; payload: Partial<OnboardingState> };

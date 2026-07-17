import type { OnboardingState } from "../types";

type Allocation = Pick<OnboardingState, "allocationNeeds" | "allocationWants" | "allocationSavings">;

const KEYS = ["allocationNeeds", "allocationWants", "allocationSavings"] as const;
type AllocationKey = (typeof KEYS)[number];

export function distributeEnvelope(
  state: Allocation,
  key: AllocationKey,
  newValue: number,
): Allocation {
  const clamped = Math.max(0, Math.min(100, newValue));
  if (clamped === state[key]) return state;

  const others = KEYS.filter((k) => k !== key);
  const o1 = state[others[0]!];
  const o2 = state[others[1]!];
  const diff = clamped - state[key];

  let n1: number;
  let n2: number;
  if (o1 > 0 && o2 > 0) {
    const ratio = o1 / (o1 + o2);
    const adj1 = Math.round(diff * ratio);
    n1 = Math.max(0, o1 - adj1);
    n2 = Math.max(0, o2 - (diff - adj1));
  } else if (o1 > 0) {
    n1 = Math.max(0, o1 - diff);
    n2 = o2;
  } else {
    n1 = o1;
    n2 = Math.max(0, o2 - diff);
  }

  return { ...state, [key]: clamped, [others[0]!]: n1, [others[1]!]: n2 };
}

export const ALLOCATION_DEFAULTS: Allocation = {
  allocationNeeds: 50,
  allocationWants: 30,
  allocationSavings: 20,
};

export type { Allocation, AllocationKey };

import { computeAllocations } from "@/shared/lib/allocations";
import type { AllocationPlan } from "@/shared/lib/incomeAllocation";
import { validateAllocationPlan } from "@/shared/lib/incomeAllocation";

export type AllocationWeights = {
  allocationNeeds: number;
  allocationWants: number;
  allocationSavings: number;
};

/**
 * Builds an explicit allocation plan for a new income.
 * Reservations come first; the remainder is split 50/30/20 into envelopes
 * unless leaveUnallocatedCents claims part of it.
 */
export function buildIncomeAllocationPlan(input: {
  amountCents: number;
  weights: AllocationWeights;
  reservations?: Array<{ commitmentId: string; amountCents: number }>;
  leaveUnallocatedCents?: number;
  savingsContributions?: AllocationPlan["savingsContributions"];
}): AllocationPlan {
  const reservations = (input.reservations ?? []).filter(
    (row) => row.amountCents > 0,
  );
  const reserved = reservations.reduce((sum, row) => sum + row.amountCents, 0);
  const contributions = (input.savingsContributions ?? []).filter(
    (row) => row.amountCents > 0,
  );
  const contributed = contributions.reduce(
    (sum, row) => sum + row.amountCents,
    0,
  );
  const leaveUnallocatedCents = Math.max(0, input.leaveUnallocatedCents ?? 0);
  const remainder =
    input.amountCents - reserved - contributed - leaveUnallocatedCents;
  if (remainder < 0) {
    throw new Error("La distribución supera el ingreso.");
  }
  const envelopes =
    remainder === 0
      ? { needs: 0, wants: 0, savings: 0 }
      : computeAllocations(remainder, input.weights);

  const plan: AllocationPlan = {
    reservations,
    envelopes,
    savingsContributions: contributions,
    leaveUnallocatedCents,
  };
  const validated = validateAllocationPlan(input.amountCents, plan);
  if (!validated.ok) {
    throw new Error(validated.message);
  }
  return plan;
}

import {
  type AllocationWeights,
  applyDistributionPolicy,
  computeAllocations,
  type DistributionPolicy,
  type EnvelopeAmounts,
} from "@/shared/lib/allocations";

export type { AllocationWeights } from "@/shared/lib/allocations";

export type EnvelopeType = "needs" | "wants" | "savings";
export type EnvelopeBalances = EnvelopeAmounts;

export function computeIncomeDistribution(
  netAvailableCents: number,
  weights: AllocationWeights,
): EnvelopeBalances {
  return computeAllocations(netAvailableCents, weights);
}

export function computeIncomeDistributionWithPolicy(
  netAvailableCents: number,
  weights: AllocationWeights,
  policy: DistributionPolicy,
): EnvelopeBalances {
  return applyDistributionPolicy(netAvailableCents, weights, policy);
}

export function computeDailyAvailableCents(
  wantsRemainingCents: number,
  daysRemaining: number,
): number {
  return Math.floor(wantsRemainingCents / Math.max(daysRemaining, 1));
}

export function computeDisplayDailyCents(dailyAvailableCents: number): number {
  return Math.max(0, dailyAvailableCents);
}

export function resolveCycleDaysForPreview(input: {
  incomeModel: "fixed" | "variable" | "mixed";
  payFrequency?: "monthly" | "biweekly" | "weekly" | "variable" | null;
  cycleDurationDays?: number | null;
}): number {
  if (input.incomeModel === "variable") {
    return input.cycleDurationDays ?? 15;
  }
  switch (input.payFrequency) {
    case "monthly":
      return 30;
    case "biweekly":
      return 15;
    case "weekly":
      return 7;
    case "variable":
      return input.cycleDurationDays ?? 15;
    default:
      return 15;
  }
}

export type ImpactPreviewInput = {
  amountCents: number;
  weights: AllocationWeights;
  currentEnvelopes: EnvelopeBalances;
  daysRemaining: number;
  distributionPolicy?: DistributionPolicy;
};

export type ImpactPreviewResult = {
  distribution: EnvelopeBalances;
  projectedEnvelopes: EnvelopeBalances;
  currentDailyCents: number;
  projectedDailyCents: number;
  weightPercents: EnvelopeBalances;
};

export function computeImpactPreview(
  input: ImpactPreviewInput,
): ImpactPreviewResult | null {
  if (input.amountCents <= 0) return null;

  const policy = input.distributionPolicy ?? "profile_default";
  const distribution = applyDistributionPolicy(
    input.amountCents,
    input.weights,
    policy,
  );
  const totalWeight =
    input.weights.allocationNeeds +
    input.weights.allocationWants +
    input.weights.allocationSavings;

  const projectedEnvelopes: EnvelopeBalances = {
    needs: input.currentEnvelopes.needs + distribution.needs,
    wants: input.currentEnvelopes.wants + distribution.wants,
    savings: input.currentEnvelopes.savings + distribution.savings,
  };

  const currentDailyCents = computeDisplayDailyCents(
    computeDailyAvailableCents(
      input.currentEnvelopes.wants,
      input.daysRemaining,
    ),
  );
  const projectedDailyCents = computeDisplayDailyCents(
    computeDailyAvailableCents(projectedEnvelopes.wants, input.daysRemaining),
  );

  const weightPercents: EnvelopeBalances =
    policy === "all_to_savings"
      ? { needs: 0, wants: 0, savings: 100 }
      : totalWeight > 0
        ? {
            needs: Math.round(
              (input.weights.allocationNeeds / totalWeight) * 100,
            ),
            wants: Math.round(
              (input.weights.allocationWants / totalWeight) * 100,
            ),
            savings: Math.round(
              (input.weights.allocationSavings / totalWeight) * 100,
            ),
          }
        : { needs: 0, wants: 0, savings: 0 };

  return {
    distribution,
    projectedEnvelopes,
    currentDailyCents,
    projectedDailyCents,
    weightPercents,
  };
}

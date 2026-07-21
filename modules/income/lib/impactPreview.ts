export type EnvelopeType = "needs" | "wants" | "savings";

export type AllocationWeights = {
  allocationNeeds: number;
  allocationWants: number;
  allocationSavings: number;
};

export type EnvelopeBalances = Record<EnvelopeType, number>;

const ENVELOPE_TYPES: EnvelopeType[] = ["needs", "wants", "savings"];

/** Mirrors convex/lib/budgetMath.computeAllocations for client-safe preview. */
export function computeIncomeDistribution(
  netAvailableCents: number,
  weights: AllocationWeights,
): EnvelopeBalances {
  const w: EnvelopeBalances = {
    needs: weights.allocationNeeds,
    wants: weights.allocationWants,
    savings: weights.allocationSavings,
  };
  const total = w.needs + w.wants + w.savings;
  if (total <= 0) {
    throw new Error("La distribución del perfil es inválida (suma 0).");
  }

  const parts = ENVELOPE_TYPES.map((type) => {
    const exact = (netAvailableCents * w[type]) / total;
    const floor = Math.floor(exact);
    return { type, floor, frac: exact - floor };
  });

  const result: EnvelopeBalances = { needs: 0, wants: 0, savings: 0 };
  for (const part of parts) result[part.type] = part.floor;

  let remainder =
    netAvailableCents - parts.reduce((acc, part) => acc + part.floor, 0);
  const byFracDesc = [...parts].sort((a, b) => b.frac - a.frac);
  for (let i = 0; remainder > 0; i++, remainder--) {
    const part = byFracDesc[i % byFracDesc.length];
    if (part) result[part.type] += 1;
  }

  return result;
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

  const distribution = computeIncomeDistribution(
    input.amountCents,
    input.weights,
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
    totalWeight > 0
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

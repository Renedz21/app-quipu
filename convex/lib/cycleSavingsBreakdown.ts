import type { DistributionPolicy } from "../../shared/lib/allocations";

const LIMA_TIMEZONE = "America/Lima";

export type CycleSavingsIncomeEvent = {
  incomeKind?: "habitual" | "extraordinary";
  distributionPolicy?: DistributionPolicy;
  distributionApplied: {
    needs: number;
    wants: number;
    savings: number;
  };
};

export type SurplusContributionSlice = {
  amount: number;
  fromEnvelope?: "needs" | "wants" | "extraordinary";
};

export type SavingsEnvelopeSlice = {
  allocatedAmount: number;
  remainingAmount: number;
};

export type CycleSavingsBreakdownNumbers = {
  savingsObjectiveCents: number;
  savingsAdditionalCents: number;
  savingsTotalCents: number;
  objectiveBarPercent: number;
  additionalBarPercent: number;
  status: "on_track" | "above_objective" | "below_objective";
  savingsSetAsideCents: number;
  objectiveProgressPercent: number;
};

/** Eng review: objective = Σ savings from profile_default or habitual (policy absent). */
export function countsTowardSavingsObjective(
  distributionPolicy: DistributionPolicy | undefined,
): boolean {
  return distributionPolicy !== "all_to_savings";
}

export function sumObjectiveSavingsFromEvents(
  incomeEvents: ReadonlyArray<CycleSavingsIncomeEvent>,
): number {
  return incomeEvents.reduce((sum, event) => {
    if (!countsTowardSavingsObjective(event.distributionPolicy)) return sum;
    return sum + Math.max(0, event.distributionApplied.savings);
  }, 0);
}

export function sumAdditionalSavingsFromEvents(
  incomeEvents: ReadonlyArray<CycleSavingsIncomeEvent>,
): number {
  return incomeEvents.reduce((sum, event) => {
    if (event.distributionPolicy !== "all_to_savings") return sum;
    return sum + Math.max(0, event.distributionApplied.savings);
  }, 0);
}

export function sumSurplusContributionAmounts(
  surplusContributions: ReadonlyArray<SurplusContributionSlice>,
): number {
  return surplusContributions.reduce(
    (sum, row) => sum + Math.max(0, row.amount),
    0,
  );
}

/** Moved from cycle savings envelope into sub-envelopes (allocated − remaining). */
export function computeSavingsSetAsideCents(
  envelope: SavingsEnvelopeSlice,
): number {
  return Math.max(0, envelope.allocatedAmount - envelope.remainingAmount);
}

export function computeObjectiveProgressPercent(
  savingsSetAsideCents: number,
  savingsObjectiveCents: number,
): number {
  if (savingsObjectiveCents <= 0) return 0;
  return Math.min(
    100,
    Math.round((savingsSetAsideCents / savingsObjectiveCents) * 100),
  );
}

export function computeObjectiveAdditionalBarPercents(
  savingsObjectiveCents: number,
  savingsTotalCents: number,
): { objectiveBarPercent: number; additionalBarPercent: number } {
  if (savingsTotalCents <= 0) {
    return { objectiveBarPercent: 0, additionalBarPercent: 0 };
  }
  const objectiveBarPercent = Math.min(
    100,
    (savingsObjectiveCents / savingsTotalCents) * 100,
  );
  return {
    objectiveBarPercent,
    additionalBarPercent: 100 - objectiveBarPercent,
  };
}

export function computeCycleSavingsBreakdown(input: {
  incomeEvents: ReadonlyArray<CycleSavingsIncomeEvent>;
  surplusContributions?: ReadonlyArray<SurplusContributionSlice>;
  savingsEnvelope?: SavingsEnvelopeSlice | null;
}): CycleSavingsBreakdownNumbers {
  const surplusContributions = input.surplusContributions ?? [];
  const savingsObjectiveCents = sumObjectiveSavingsFromEvents(
    input.incomeEvents,
  );
  const savingsAdditionalCents =
    sumAdditionalSavingsFromEvents(input.incomeEvents) +
    sumSurplusContributionAmounts(surplusContributions);
  const savingsTotalCents = savingsObjectiveCents + savingsAdditionalCents;

  const savingsSetAsideCents = input.savingsEnvelope
    ? computeSavingsSetAsideCents(input.savingsEnvelope)
    : 0;
  const objectiveProgressPercent = computeObjectiveProgressPercent(
    savingsSetAsideCents,
    savingsObjectiveCents,
  );

  const isUnderObjective =
    input.savingsEnvelope != null &&
    savingsObjectiveCents > 0 &&
    savingsSetAsideCents < savingsObjectiveCents;

  let status: CycleSavingsBreakdownNumbers["status"] = "on_track";
  if (savingsAdditionalCents > 0) {
    status = "above_objective";
  } else if (isUnderObjective) {
    status = "below_objective";
  }

  const { objectiveBarPercent, additionalBarPercent } =
    computeObjectiveAdditionalBarPercents(
      savingsObjectiveCents,
      savingsTotalCents,
    );

  return {
    savingsObjectiveCents,
    savingsAdditionalCents,
    savingsTotalCents,
    objectiveBarPercent,
    additionalBarPercent,
    status,
    savingsSetAsideCents,
    objectiveProgressPercent,
  };
}

export function buildCycleSavingsContextLabel(
  cycleStartDate: number,
  events: ReadonlyArray<CycleSavingsIncomeEvent>,
): string {
  const month = new Intl.DateTimeFormat("es-PE", {
    timeZone: LIMA_TIMEZONE,
    month: "long",
  }).format(new Date(cycleStartDate));
  const monthCapitalized = month.charAt(0).toUpperCase() + month.slice(1);

  const hasHabitual = events.some(
    (event) => event.incomeKind !== "extraordinary",
  );
  const hasExtraordinary = events.some(
    (event) => event.incomeKind === "extraordinary",
  );

  let incomeHint = "sin ingresos aún";
  if (hasHabitual && hasExtraordinary) {
    incomeHint = "sueldo + gratificación";
  } else if (hasHabitual) {
    incomeHint = "sueldo";
  } else if (hasExtraordinary) {
    incomeHint = "ingreso extraordinario";
  }

  return `${monthCapitalized} · ${incomeHint}`;
}

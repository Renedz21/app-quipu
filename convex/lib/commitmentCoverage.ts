import { daysUntilDueDay } from "./dashboardMath";

const LIMA_TIMEZONE = "America/Lima";

export type CommitmentSlice = {
  id: string;
  amount: number;
  envelope: "needs" | "wants";
  dueDay: number;
};

export type CycleSlice = {
  startDate: number;
  endDate: number;
};

export type IncomeEventSlice = {
  id: string;
  occurredAt: number;
  distributionApplied: {
    needs: number;
    wants: number;
    savings: number;
  };
};

export type FundingEvent = {
  eventId: string;
  amount: number;
};

export type CommitmentCoverageStatus =
  | "covered"
  | "partial"
  | "not-started"
  | "overdue";

export type CommitmentCoverageResult = {
  covered: number;
  remaining: number;
  fundingEvents: FundingEvent[];
  status: CommitmentCoverageStatus;
};

export type DashboardCoverageStatus = "covered" | "partial" | "uncovered";

function getLimaDay(now: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: LIMA_TIMEZONE,
    day: "numeric",
  }).formatToParts(new Date(now));

  return Number(parts.find((part) => part.type === "day")?.value ?? 1);
}

function isPastDueDay(dueDay: number, now: number): boolean {
  return getLimaDay(now) > dueDay;
}

export function resolveCommitmentCoverageStatus(params: {
  covered: number;
  remaining: number;
  dueDay: number;
  now: number;
}): CommitmentCoverageStatus {
  const { covered, remaining, dueDay, now } = params;

  if (remaining <= 0) return "covered";
  if (isPastDueDay(dueDay, now)) return "overdue";
  if (covered > 0) return "partial";
  return "not-started";
}

export function mapCoverageStatusToDashboard(
  status: CommitmentCoverageStatus,
): DashboardCoverageStatus {
  switch (status) {
    case "covered":
      return "covered";
    case "partial":
      return "partial";
    case "not-started":
    case "overdue":
      return "uncovered";
  }
}

function filterIncomeEventsInCycle(
  incomeEvents: IncomeEventSlice[],
  cycle: CycleSlice,
): IncomeEventSlice[] {
  return incomeEvents
    .filter(
      (event) =>
        event.occurredAt >= cycle.startDate && event.occurredAt < cycle.endDate,
    )
    .sort((a, b) => a.occurredAt - b.occurredAt);
}

export type CoverageBoost = {
  needs: number;
  wants: number;
};

export function computeAllCommitmentCoverage(params: {
  commitments: CommitmentSlice[];
  cycle: CycleSlice;
  incomeEvents: IncomeEventSlice[];
  now: number;
  coverageBoost?: CoverageBoost;
  excludedCommitmentIds?: ReadonlySet<string>;
}): Map<string, CommitmentCoverageResult> {
  const {
    commitments,
    cycle,
    incomeEvents,
    now,
    coverageBoost,
    excludedCommitmentIds,
  } = params;
  const results = new Map<string, CommitmentCoverageResult>();
  const eventsInWindow = filterIncomeEventsInCycle(incomeEvents, cycle);
  const activeCommitments = commitments.filter(
    (commitment) => !excludedCommitmentIds?.has(commitment.id),
  );

  for (const commitment of commitments) {
    if (excludedCommitmentIds?.has(commitment.id)) {
      results.set(commitment.id, {
        covered: 0,
        remaining: 0,
        fundingEvents: [],
        status: "covered",
      });
    }
  }

  for (const envelope of ["needs", "wants"] as const) {
    const eventRemaining = new Map<string, number>();

    for (const event of eventsInWindow) {
      const allocation = event.distributionApplied[envelope];
      if (allocation > 0) {
        eventRemaining.set(event.id, allocation);
      }
    }

    const boostAmount = coverageBoost?.[envelope] ?? 0;
    if (boostAmount > 0) {
      eventRemaining.set(`__boost_${envelope}__`, boostAmount);
    }

    const envelopeCommitments = activeCommitments
      .filter((commitment) => commitment.envelope === envelope)
      .sort((a, b) => {
        const dueDiff = a.dueDay - b.dueDay;
        if (dueDiff !== 0) return dueDiff;
        return a.id.localeCompare(b.id);
      });

    for (const commitment of envelopeCommitments) {
      let covered = 0;
      const fundingEvents: FundingEvent[] = [];
      let need = commitment.amount;

      for (const [eventId, available] of eventRemaining) {
        if (need <= 0) break;
        if (available <= 0) continue;

        const allocated = Math.min(need, available);
        covered += allocated;
        need -= allocated;
        eventRemaining.set(eventId, available - allocated);
        fundingEvents.push({ eventId, amount: allocated });
      }

      const remaining = commitment.amount - covered;
      results.set(commitment.id, {
        covered,
        remaining,
        fundingEvents,
        status: resolveCommitmentCoverageStatus({
          covered,
          remaining,
          dueDay: commitment.dueDay,
          now,
        }),
      });
    }
  }

  for (const commitment of activeCommitments) {
    if (results.has(commitment.id)) continue;

    results.set(commitment.id, {
      covered: 0,
      remaining: commitment.amount,
      fundingEvents: [],
      status: resolveCommitmentCoverageStatus({
        covered: 0,
        remaining: commitment.amount,
        dueDay: commitment.dueDay,
        now,
      }),
    });
  }

  return results;
}

export function computeCommitmentCoverage(params: {
  commitment: CommitmentSlice;
  commitments?: CommitmentSlice[];
  cycle: CycleSlice;
  incomeEvents: IncomeEventSlice[];
  now: number;
}): CommitmentCoverageResult {
  const commitments = params.commitments ?? [params.commitment];
  const cascade = computeAllCommitmentCoverage({
    commitments,
    cycle: params.cycle,
    incomeEvents: params.incomeEvents,
    now: params.now,
  });

  return (
    cascade.get(params.commitment.id) ?? {
      covered: 0,
      remaining: params.commitment.amount,
      fundingEvents: [],
      status: resolveCommitmentCoverageStatus({
        covered: 0,
        remaining: params.commitment.amount,
        dueDay: params.commitment.dueDay,
        now: params.now,
      }),
    }
  );
}

export function computeCoverageProgressPercent(
  covered: number,
  amount: number,
): number {
  if (amount <= 0) return 0;
  return Math.min(100, Math.round((covered / amount) * 100));
}

export function computeUncoveredCommitmentRemainingCents(
  commitments: Array<{
    remaining: number;
    status: CommitmentCoverageStatus;
  }>,
): number {
  return commitments
    .filter((commitment) => commitment.status !== "covered")
    .reduce((acc, commitment) => acc + commitment.remaining, 0);
}

export { daysUntilDueDay };

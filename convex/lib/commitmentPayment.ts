import type { Id } from "../_generated/dataModel";

const LIMA_TIMEZONE = "America/Lima";

function getLimaDay(now: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: LIMA_TIMEZONE,
    day: "numeric",
  }).formatToParts(new Date(now));

  return Number(parts.find((part) => part.type === "day")?.value ?? 1);
}

export function isPastDueDay(dueDay: number, now: number): boolean {
  return getLimaDay(now) > dueDay;
}

export type CommitmentPaymentStatus = "paid" | "pending" | "overdue";

export function isCommitmentPaidForCycle(
  commitment: {
    paidAt?: number;
    paidForCycleId?: Id<"financialCycles">;
  },
  activeCycleId: Id<"financialCycles"> | null,
): boolean {
  return (
    commitment.paidAt != null &&
    activeCycleId != null &&
    commitment.paidForCycleId === activeCycleId
  );
}

/**
 * Tracks whether the user confirmed paying the obligation this cycle.
 * Independent from cascade coverage — does not move envelope balances.
 */
export function resolveCommitmentPaymentStatus(params: {
  paidAt?: number;
  paidForCycleId?: Id<"financialCycles">;
  activeCycleId: Id<"financialCycles"> | null;
  dueDay: number;
  now: number;
}): CommitmentPaymentStatus {
  if (
    isCommitmentPaidForCycle(
      {
        paidAt: params.paidAt,
        paidForCycleId: params.paidForCycleId,
      },
      params.activeCycleId,
    )
  ) {
    return "paid";
  }

  if (params.activeCycleId == null) {
    return "pending";
  }

  if (isPastDueDay(params.dueDay, params.now)) {
    return "overdue";
  }

  return "pending";
}

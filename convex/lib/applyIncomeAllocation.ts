import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  type AllocationPlan,
  buildAllocationApplyResult,
} from "./incomeAllocation";

export async function persistIncomeAllocation(
  ctx: MutationCtx,
  input: {
    profileId: Id<"profiles">;
    cycleId: Id<"financialCycles">;
    incomeEventId: Id<"incomeEvents">;
    amountCents: number;
    plan: AllocationPlan;
    now: number;
    emergencyFundId?: Id<"subEnvelopes">;
  },
): Promise<{
  distributionApplied: { needs: number; wants: number; savings: number };
  heldCents: number;
  unallocatedCents: number;
  reservationIds: Id<"commitmentReservations">[];
}> {
  const applied = buildAllocationApplyResult({
    amountCents: input.amountCents,
    plan: input.plan,
  });

  const reservationIds: Id<"commitmentReservations">[] = [];

  for (const reservation of input.plan.reservations) {
    if (reservation.amountCents <= 0) continue;
    const commitmentId = reservation.commitmentId as Id<"fixedCommitments">;
    const commitment = await ctx.db.get(commitmentId);
    if (!commitment || commitment.profileId !== input.profileId) {
      throw new Error("Compromiso no válido para reservar.");
    }
    const reservationId = await ctx.db.insert("commitmentReservations", {
      profileId: input.profileId,
      cycleId: input.cycleId,
      commitmentId,
      incomeEventId: input.incomeEventId,
      reservedCents: reservation.amountCents,
      status: "active",
      consumedCents: 0,
      releasedCents: 0,
      createdAt: input.now,
    });
    reservationIds.push(reservationId);
    await ctx.db.insert("incomeAllocationLines", {
      profileId: input.profileId,
      cycleId: input.cycleId,
      incomeEventId: input.incomeEventId,
      destination: "commitment_reservation",
      amountCents: reservation.amountCents,
      commitmentId,
      reservationId,
      createdAt: input.now,
    });
  }

  const envelopeDest = {
    needs: "envelope_needs",
    wants: "envelope_wants",
    savings: "envelope_savings",
  } as const;

  for (const type of ["needs", "wants", "savings"] as const) {
    const amountCents = input.plan.envelopes[type];
    if (amountCents <= 0) continue;
    await ctx.db.insert("incomeAllocationLines", {
      profileId: input.profileId,
      cycleId: input.cycleId,
      incomeEventId: input.incomeEventId,
      destination: envelopeDest[type],
      amountCents,
      createdAt: input.now,
    });
  }

  for (const contribution of input.plan.savingsContributions) {
    if (contribution.amountCents <= 0) continue;
    const subEnvelopeId = (contribution.subEnvelopeId ??
      input.emergencyFundId) as Id<"subEnvelopes"> | undefined;
    if (!subEnvelopeId) {
      throw new Error("No hay Fondo para registrar el aporte de ahorro.");
    }
    const subEnvelope = await ctx.db.get(subEnvelopeId);
    if (!subEnvelope || subEnvelope.profileId !== input.profileId) {
      throw new Error("Meta de ahorro no válida.");
    }
    await ctx.db.patch(subEnvelopeId, {
      currentAmount: subEnvelope.currentAmount + contribution.amountCents,
    });
    await ctx.db.insert("incomeAllocationLines", {
      profileId: input.profileId,
      cycleId: input.cycleId,
      incomeEventId: input.incomeEventId,
      destination: "savings_contribution",
      amountCents: contribution.amountCents,
      subEnvelopeId,
      contributionKind: contribution.kind,
      createdAt: input.now,
    });
  }

  if (input.plan.leaveUnallocatedCents > 0) {
    await ctx.db.insert("incomeAllocationLines", {
      profileId: input.profileId,
      cycleId: input.cycleId,
      incomeEventId: input.incomeEventId,
      destination: "unallocated",
      amountCents: input.plan.leaveUnallocatedCents,
      createdAt: input.now,
    });
  }

  return {
    distributionApplied: applied.distributionApplied,
    heldCents: applied.heldFromReservationsCents,
    unallocatedCents: applied.totals.unallocatedCents,
    reservationIds,
  };
}

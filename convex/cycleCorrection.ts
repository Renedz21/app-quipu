import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { sumActiveReservedCents } from "./lib/commitmentReservation";
import {
  buildCycleCorrectionTransfers,
  type CycleCorrectionPlan,
} from "./lib/cycleCorrection";
import { evaluateCommitmentCoverageForCycle } from "./lib/evaluateCommitmentCoverage";
import { assertNonNegativeCents } from "./lib/moneyInvariant";

export const correctActiveCycleAllocation = mutation({
  args: {
    reserveToCommitments: v.array(
      v.object({
        commitmentId: v.id("fixedCommitments"),
        amountCents: v.number(),
      }),
    ),
    setEnvelopeRemaining: v.object({
      needs: v.number(),
      wants: v.number(),
      savings: v.number(),
    }),
    contributeToSavings: v.array(
      v.object({
        amountCents: v.number(),
        kind: v.union(v.literal("objective"), v.literal("additional")),
        subEnvelopeId: v.optional(v.id("subEnvelopes")),
      }),
    ),
    setUnallocatedCents: v.number(),
    note: v.optional(v.string()),
  },
  returns: v.object({
    success: v.literal(true),
    transferCount: v.number(),
    contributionCents: v.number(),
    unallocatedCents: v.number(),
    reservedCents: v.number(),
    spendableCents: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión con tu Passkey o credencial.",
      });
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!profile) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Perfil no encontrado.",
      });
    }

    const activeCycle = await ctx.db
      .query("financialCycles")
      .withIndex("by_profile_status", (q) =>
        q.eq("profileId", profile._id).eq("status", "active"),
      )
      .unique();
    if (!activeCycle) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Necesitas un ciclo activo para corregir la distribución.",
      });
    }

    const plan: CycleCorrectionPlan = {
      reserveToCommitments: args.reserveToCommitments.map((row) => ({
        commitmentId: row.commitmentId,
        amountCents: row.amountCents,
      })),
      setEnvelopeRemaining: args.setEnvelopeRemaining,
      contributeToSavings: args.contributeToSavings.map((row) => ({
        amountCents: row.amountCents,
        kind: row.kind,
        subEnvelopeId: row.subEnvelopeId,
      })),
      setUnallocatedCents: args.setUnallocatedCents,
      note: args.note,
    };

    const envelopes = await ctx.db
      .query("envelopes")
      .withIndex("by_cycle_type", (q) => q.eq("cycleId", activeCycle._id))
      .collect();
    const needs = envelopes.find((e) => e.type === "needs");
    const wants = envelopes.find((e) => e.type === "wants");
    const savings = envelopes.find((e) => e.type === "savings");
    if (!needs || !wants || !savings) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Faltan sobres del ciclo activo.",
      });
    }

    const existingReservations = await ctx.db
      .query("commitmentReservations")
      .withIndex("by_cycle", (q) => q.eq("cycleId", activeCycle._id))
      .collect();

    const before = {
      needsRemaining: needs.remainingAmount,
      wantsRemaining: wants.remainingAmount,
      savingsRemaining: savings.remainingAmount,
      unallocatedCents: activeCycle.unallocatedCents ?? 0,
      activeReservedCents: sumActiveReservedCents(existingReservations),
    };

    let draft: ReturnType<typeof buildCycleCorrectionTransfers>;
    try {
      draft = buildCycleCorrectionTransfers({ before, plan });
    } catch (error) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message:
          error instanceof Error ? error.message : "Corrección inválida.",
      });
    }

    if (!draft.conservedLiquidMinusContributions) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message:
          "La corrección no conserva el dinero líquido. Revisa los montos (sobres + reservado + por repartir + aportes).",
      });
    }

    const now = Date.now();

    // Release previous active reservations (return conceptually into correction pool).
    for (const reservation of existingReservations) {
      if (
        reservation.status === "consumed" ||
        reservation.status === "released"
      ) {
        continue;
      }
      await ctx.db.patch(reservation._id, {
        status: "released",
        releasedCents: reservation.reservedCents - reservation.consumedCents,
        updatedAt: now,
      });
      await ctx.db.insert("internalTransfers", {
        profileId: profile._id,
        cycleId: activeCycle._id,
        kind: "reservation_release",
        amountCents: reservation.reservedCents - reservation.consumedCents,
        from: `reservation:${reservation._id}`,
        to: "correction:pool",
        note: args.note,
        createdAt: now,
      });
    }

    // Apply envelope remaining targets; adjust allocated so progress stays coherent.
    for (const type of ["needs", "wants", "savings"] as const) {
      const envelope = envelopes.find((row) => row.type === type);
      if (!envelope) continue;
      const targetRemaining = plan.setEnvelopeRemaining[type];
      assertNonNegativeCents(targetRemaining, type);
      const spent = Math.max(
        0,
        envelope.allocatedAmount - envelope.remainingAmount,
      );
      await ctx.db.patch(envelope._id, {
        remainingAmount: targetRemaining,
        allocatedAmount: spent + targetRemaining,
      });
    }

    // Create new reservations from plan.
    let reservedCents = 0;
    for (const row of args.reserveToCommitments) {
      if (row.amountCents <= 0) continue;
      const commitment = await ctx.db.get(row.commitmentId);
      if (!commitment || commitment.profileId !== profile._id) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Compromiso no encontrado para reservar.",
        });
      }
      const reservationId = await ctx.db.insert("commitmentReservations", {
        profileId: profile._id,
        cycleId: activeCycle._id,
        commitmentId: row.commitmentId,
        reservedCents: row.amountCents,
        status: "active",
        consumedCents: 0,
        releasedCents: 0,
        createdAt: now,
      });
      reservedCents += row.amountCents;
      await ctx.db.insert("internalTransfers", {
        profileId: profile._id,
        cycleId: activeCycle._id,
        kind: "unallocated_to_reservation",
        amountCents: row.amountCents,
        from: "correction:pool",
        to: `reservation:${reservationId}`,
        note: args.note,
        createdAt: now,
      });
    }

    // Confirmed contributions to Fondo/metas.
    let contributionCents = 0;
    const subEnvelopes = await ctx.db
      .query("subEnvelopes")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .collect();
    const defaultFund =
      subEnvelopes.find((row) => row.isSystemDefault) ?? subEnvelopes[0];

    for (const contribution of args.contributeToSavings) {
      if (contribution.amountCents <= 0) continue;
      const targetId = contribution.subEnvelopeId ?? defaultFund?._id;
      if (!targetId) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "No hay Fondo para el aporte.",
        });
      }
      const sub = await ctx.db.get(targetId);
      if (!sub || sub.profileId !== profile._id) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Meta de ahorro no encontrada.",
        });
      }
      await ctx.db.patch(targetId, {
        currentAmount: sub.currentAmount + contribution.amountCents,
      });
      contributionCents += contribution.amountCents;
      if (contribution.kind === "additional") {
        await ctx.db.insert("surplusContributions", {
          profileId: profile._id,
          cycleId: activeCycle._id,
          fromEnvelope: "needs",
          amount: contribution.amountCents,
          subEnvelopeId: targetId,
          createdAt: now,
          contributionKind: "additional",
        });
      } else {
        await ctx.db.insert("surplusContributions", {
          profileId: profile._id,
          cycleId: activeCycle._id,
          fromEnvelope: "needs",
          amount: contribution.amountCents,
          subEnvelopeId: targetId,
          createdAt: now,
          contributionKind: "objective",
        });
      }
      await ctx.db.insert("internalTransfers", {
        profileId: profile._id,
        cycleId: activeCycle._id,
        kind: "unallocated_to_savings",
        amountCents: contribution.amountCents,
        from: "correction:pool",
        to: `subEnvelope:${targetId}`,
        note: args.note,
        createdAt: now,
      });
    }

    for (const transfer of draft.transfers) {
      await ctx.db.insert("internalTransfers", {
        profileId: profile._id,
        cycleId: activeCycle._id,
        kind: transfer.kind,
        amountCents: transfer.amountCents,
        from: transfer.from,
        to: transfer.to,
        note: args.note,
        createdAt: now,
      });
    }

    await ctx.db.patch(activeCycle._id, {
      unallocatedCents: plan.setUnallocatedCents,
      needsReview: false,
    });

    await evaluateCommitmentCoverageForCycle(
      ctx,
      profile._id,
      activeCycle._id,
      now,
    );

    const spendableCents =
      plan.setEnvelopeRemaining.needs + plan.setEnvelopeRemaining.wants;

    return {
      success: true as const,
      transferCount: draft.transfers.length,
      contributionCents,
      unallocatedCents: plan.setUnallocatedCents,
      reservedCents,
      spendableCents,
    };
  },
});

/** Lets an affected user flag their active cycle for redistribution review. */
export const markActiveCycleNeedsReview = mutation({
  args: {},
  returns: v.object({
    success: v.literal(true),
    cycleId: v.id("financialCycles"),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión con tu Passkey o credencial.",
      });
    }
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!profile) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Perfil no encontrado.",
      });
    }
    const activeCycle = await ctx.db
      .query("financialCycles")
      .withIndex("by_profile_status", (q) =>
        q.eq("profileId", profile._id).eq("status", "active"),
      )
      .unique();
    if (!activeCycle) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Necesitas un ciclo activo.",
      });
    }
    await ctx.db.patch(activeCycle._id, { needsReview: true });
    return { success: true as const, cycleId: activeCycle._id };
  },
});

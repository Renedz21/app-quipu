import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  computeAllCommitmentCoverage,
  computeCoverageProgressPercent,
  daysUntilNextDue,
  mapCoverageStatusToDashboard,
} from "./lib/commitmentCoverage";
import {
  computeInitialNextDueAt,
  computeNextDueAtAfterPayment,
  resolveCommitmentNextDueAt,
} from "./lib/commitmentDueDate";
import {
  isCommitmentPaidForCycle,
  resolveCommitmentPaymentStatus,
} from "./lib/commitmentPayment";
import {
  activeReservedCents,
  applyPayFromReservations,
} from "./lib/commitmentReservation";

export const listMyCommitments = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!profile) return [];

    return await ctx.db
      .query("fixedCommitments")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .collect();
  },
});

export const createFixedCommitment = mutation({
  args: {
    name: v.string(),
    amount: v.number(),
    envelope: v.union(v.literal("needs"), v.literal("wants")),
    dueDay: v.number(), // 1-31
  },
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

    const name = args.name.trim();
    if (!name) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "El nombre del compromiso es obligatorio.",
        data: { field: "name" },
      });
    }
    if (!Number.isInteger(args.amount) || args.amount <= 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "El monto debe ser un entero de céntimos mayor a cero.",
        data: { field: "amount" },
      });
    }
    if (!Number.isInteger(args.dueDay) || args.dueDay < 1 || args.dueDay > 31) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "dueDay debe ser un entero entre 1 y 31.",
        data: { field: "dueDay" },
      });
    }

    const createdAt = Date.now();
    const nextDueAt = computeInitialNextDueAt(args.dueDay, createdAt);

    return await ctx.db.insert("fixedCommitments", {
      profileId: profile._id,
      name,
      amount: args.amount,
      envelope: args.envelope,
      dueDay: args.dueDay,
      nextDueAt,
    });
  },
});

export const deleteFixedCommitment = mutation({
  args: { commitmentId: v.id("fixedCommitments") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión con tu Passkey o credencial.",
      });
    }

    const commitment = await ctx.db.get(args.commitmentId);
    if (!commitment) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Compromiso no encontrado.",
      });
    }

    const profile = await ctx.db.get(commitment.profileId);
    if (!profile || profile.userId !== identity.subject) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "No tienes permisos para eliminar este registro.",
      });
    }

    await ctx.db.delete(args.commitmentId);
    return { success: true };
  },
});

export const markCommitmentAsPaid = mutation({
  args: { commitmentId: v.id("fixedCommitments") },
  returns: v.object({ success: v.literal(true), paidAt: v.number() }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión con tu Passkey o credencial.",
      });
    }

    const commitment = await ctx.db.get(args.commitmentId);
    if (!commitment) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Compromiso no encontrado.",
      });
    }

    const profile = await ctx.db.get(commitment.profileId);
    if (!profile || profile.userId !== identity.subject) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "No tienes permisos para actualizar este registro.",
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
        message:
          "Necesitas un ciclo activo para marcar un compromiso como pagado.",
      });
    }

    if (
      isCommitmentPaidForCycle(
        {
          paidAt: commitment.paidAt,
          paidForCycleId: commitment.paidForCycleId,
        },
        activeCycle._id,
      )
    ) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Este compromiso ya está marcado como pagado en este ciclo.",
      });
    }

    const paidAt = Date.now();
    const currentNextDueAt = resolveCommitmentNextDueAt({
      dueDay: commitment.dueDay,
      nextDueAt: commitment.nextDueAt,
      createdAt: commitment._creationTime,
    });
    const nextDueAt = computeNextDueAtAfterPayment({
      currentNextDueAt,
      dueDay: commitment.dueDay,
      now: paidAt,
    });

    await ctx.db.patch(args.commitmentId, {
      paidAt,
      paidForCycleId: activeCycle._id,
      nextDueAt,
    });

    // Consume active reservations first so reserved money is not spent twice.
    const reservations = await ctx.db
      .query("commitmentReservations")
      .withIndex("by_commitment_cycle", (q) =>
        q.eq("commitmentId", args.commitmentId).eq("cycleId", activeCycle._id),
      )
      .collect();
    const pay = applyPayFromReservations({
      dueCents: commitment.amount,
      reservations: reservations.map((row) => ({
        id: row._id,
        reservedCents: row.reservedCents,
        consumedCents: row.consumedCents,
        releasedCents: row.releasedCents,
        status: row.status,
      })),
    });
    await Promise.all(
      pay.reservationPatches.map((patch) =>
        ctx.db.patch(patch.id as (typeof reservations)[0]["_id"], {
          consumedCents: patch.consumedCents,
          status: patch.status,
          updatedAt: paidAt,
        }),
      ),
    );
    if (pay.remainderCents > 0) {
      const envelope = await ctx.db
        .query("envelopes")
        .withIndex("by_cycle_type", (q) =>
          q.eq("cycleId", activeCycle._id).eq("type", commitment.envelope),
        )
        .unique();
      if (envelope && envelope.remainingAmount >= pay.remainderCents) {
        await ctx.db.patch(envelope._id, {
          remainingAmount: envelope.remainingAmount - pay.remainderCents,
        });
        await ctx.db.insert("expenses", {
          profileId: profile._id,
          cycleId: activeCycle._id,
          envelopeId: envelope._id,
          amount: pay.remainderCents,
          description: `Pago: ${commitment.name}`,
          timestamp: paidAt,
        });
      }
    }

    return { success: true as const, paidAt };
  },
});

/**
 * Crea N compromisos fijos en una sola mutation atómica.
 * Usado por el onboarding v2.5 (paso 6) para evitar N round-trips.
 *
 * Valida que todos los profileId coincidan con la sesión, que cada
 * name no esté vacío, cada amount sea entero positivo, y cada dueDay
 * esté en 1-31. Si alguna validación falla, ningún commitment se crea
 * (atomicidad de la mutation).
 */
export const createCommitmentsBulk = mutation({
  args: {
    profileId: v.id("profiles"),
    commitments: v.array(
      v.object({
        name: v.string(),
        amount: v.number(),
        envelope: v.union(v.literal("needs"), v.literal("wants")),
        dueDay: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión con tu Passkey o credencial.",
      });
    }

    const profile = await ctx.db.get(args.profileId);
    if (!profile || profile.userId !== identity.subject) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Perfil no encontrado o no autorizado.",
      });
    }

    // Valida todos antes de insertar (atomicidad).
    for (const [i, c] of args.commitments.entries()) {
      if (!c.name.trim()) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "El nombre del compromiso es obligatorio.",
          data: { field: `commitments[${i}].name` },
        });
      }
      if (!Number.isInteger(c.amount) || c.amount <= 0) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "El monto debe ser un entero de céntimos mayor a cero.",
          data: { field: `commitments[${i}].amount` },
        });
      }
      if (!Number.isInteger(c.dueDay) || c.dueDay < 1 || c.dueDay > 31) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "dueDay debe ser un entero entre 1 y 31.",
          data: { field: `commitments[${i}].dueDay` },
        });
      }
    }

    const ids: Id<"fixedCommitments">[] = [];
    const createdAt = Date.now();
    for (const c of args.commitments) {
      const nextDueAt = computeInitialNextDueAt(c.dueDay, createdAt);
      const id = await ctx.db.insert("fixedCommitments", {
        profileId: args.profileId,
        name: c.name.trim(),
        amount: c.amount,
        envelope: c.envelope,
        dueDay: c.dueDay,
        nextDueAt,
      });
      ids.push(id);
    }
    return ids;
  },
});

export const getCommitment = query({
  args: { commitmentId: v.id("fixedCommitments") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const commitment = await ctx.db.get(args.commitmentId);
    if (!commitment) return null;

    const profile = await ctx.db.get(commitment.profileId);
    if (!profile || profile.userId !== identity.subject) return null;

    const now = Date.now();
    const activeCycle = await ctx.db
      .query("financialCycles")
      .withIndex("by_profile_status", (q) =>
        q.eq("profileId", profile._id).eq("status", "active"),
      )
      .unique();

    let coverageStatus: "covered" | "partial" | "uncovered" = "uncovered";
    const nextDueAt = resolveCommitmentNextDueAt({
      dueDay: commitment.dueDay,
      nextDueAt: commitment.nextDueAt,
      createdAt: commitment._creationTime,
    });
    if (activeCycle) {
      const [incomeEvents, reservationRows] = await Promise.all([
        ctx.db
          .query("incomeEvents")
          .withIndex("by_cycle", (q) => q.eq("cycleId", activeCycle._id))
          .collect(),
        ctx.db
          .query("commitmentReservations")
          .withIndex("by_cycle", (q) => q.eq("cycleId", activeCycle._id))
          .collect(),
      ]);
      const coverageById = computeAllCommitmentCoverage({
        commitments: [
          {
            id: commitment._id,
            amount: commitment.amount,
            envelope: commitment.envelope,
            dueDay: commitment.dueDay,
            nextDueAt: commitment.nextDueAt,
            createdAt: commitment._creationTime,
          },
        ],
        cycle: {
          startDate: activeCycle.startDate,
          endDate: activeCycle.endDate,
        },
        incomeEvents: incomeEvents.map((event) => ({
          id: event._id,
          occurredAt: event.occurredAt,
          distributionApplied: event.distributionApplied,
        })),
        now,
        reservations: reservationRows.map((row) => ({
          commitmentId: row.commitmentId,
          activeCents: activeReservedCents(row),
          incomeEventId: row.incomeEventId,
        })),
      });
      const cascadeStatus =
        coverageById.get(commitment._id)?.status ?? "not-started";
      coverageStatus = mapCoverageStatusToDashboard(cascadeStatus);
    }

    const paymentStatus = resolveCommitmentPaymentStatus({
      paidAt: commitment.paidAt,
      paidForCycleId: commitment.paidForCycleId,
      activeCycleId: activeCycle?._id ?? null,
      nextDueAt,
      now,
    });

    return {
      id: commitment._id,
      name: commitment.name,
      amount: commitment.amount,
      envelope: commitment.envelope,
      dueDay: commitment.dueDay,
      nextDueAt,
      createdAt: commitment._creationTime,
      daysUntilDue: daysUntilNextDue(nextDueAt, now),
      coveredAt: commitment.coveredAt,
      coverageStatus,
      paymentStatus,
      paidAtForCycle: paymentStatus === "paid" ? commitment.paidAt : undefined,
      hasActiveCycle: activeCycle != null,
      currencyCode: profile.currencyCode,
    };
  },
});

export const getCommitmentCoverage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!profile) return null;

    const activeCycle = await ctx.db
      .query("financialCycles")
      .withIndex("by_profile_status", (q) =>
        q.eq("profileId", profile._id).eq("status", "active"),
      )
      .unique();

    const commitments = await ctx.db
      .query("fixedCommitments")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .collect();

    const now = Date.now();

    if (!activeCycle) {
      const totalCents = commitments.reduce((sum, c) => sum + c.amount, 0);
      return {
        currencyCode: profile.currencyCode,
        cycle: null,
        cycleId: null,
        totalCents,
        commitments: commitments.map((commitment) => {
          const nextDueAt = resolveCommitmentNextDueAt({
            dueDay: commitment.dueDay,
            nextDueAt: commitment.nextDueAt,
            createdAt: commitment._creationTime,
          });
          return {
            id: commitment._id,
            name: commitment.name,
            amount: commitment.amount,
            envelope: commitment.envelope,
            dueDay: commitment.dueDay,
            daysUntilDue: daysUntilNextDue(nextDueAt, now),
            nextDueAt,
            covered: 0,
            remaining: commitment.amount,
            progressPercent: 0,
            coverageStatus: "uncovered" as const,
            cascadeStatus: "not-started" as const,
            fundingEvents: [],
            coveredAt: commitment.coveredAt,
            paymentStatus: resolveCommitmentPaymentStatus({
              paidAt: commitment.paidAt,
              paidForCycleId: commitment.paidForCycleId,
              activeCycleId: null,
              nextDueAt,
              now,
            }),
            paidAtForCycle: undefined,
          };
        }),
      };
    }

    const incomeEvents = await ctx.db
      .query("incomeEvents")
      .withIndex("by_cycle", (q) => q.eq("cycleId", activeCycle._id))
      .collect();

    const coverageById = computeAllCommitmentCoverage({
      commitments: commitments.map((commitment) => ({
        id: commitment._id,
        amount: commitment.amount,
        envelope: commitment.envelope,
        dueDay: commitment.dueDay,
        nextDueAt: commitment.nextDueAt,
        createdAt: commitment._creationTime,
      })),
      cycle: {
        startDate: activeCycle.startDate,
        endDate: activeCycle.endDate,
      },
      incomeEvents: incomeEvents.map((event) => ({
        id: event._id,
        occurredAt: event.occurredAt,
        distributionApplied: event.distributionApplied,
      })),
      now,
    });

    const totalCents = commitments.reduce((sum, c) => sum + c.amount, 0);

    return {
      currencyCode: profile.currencyCode,
      cycle: {
        startDate: activeCycle.startDate,
        endDate: activeCycle.endDate,
      },
      cycleId: activeCycle._id,
      totalCents,
      commitments: commitments
        .map((commitment) => {
          const nextDueAt = resolveCommitmentNextDueAt({
            dueDay: commitment.dueDay,
            nextDueAt: commitment.nextDueAt,
            createdAt: commitment._creationTime,
          });
          const coverage = coverageById.get(commitment._id);
          const covered = coverage?.covered ?? 0;
          const remaining = coverage?.remaining ?? commitment.amount;
          const cascadeStatus = coverage?.status ?? "not-started";
          const paymentStatus = resolveCommitmentPaymentStatus({
            paidAt: commitment.paidAt,
            paidForCycleId: commitment.paidForCycleId,
            activeCycleId: activeCycle._id,
            nextDueAt,
            now,
          });

          return {
            id: commitment._id,
            name: commitment.name,
            amount: commitment.amount,
            envelope: commitment.envelope,
            dueDay: commitment.dueDay,
            nextDueAt,
            daysUntilDue: daysUntilNextDue(nextDueAt, now),
            covered,
            remaining,
            progressPercent: computeCoverageProgressPercent(
              covered,
              commitment.amount,
            ),
            coverageStatus: mapCoverageStatusToDashboard(cascadeStatus),
            cascadeStatus,
            fundingEvents: coverage?.fundingEvents ?? [],
            coveredAt: commitment.coveredAt,
            paymentStatus,
            paidAtForCycle:
              paymentStatus === "paid" ? commitment.paidAt : undefined,
          };
        })
        .sort((a, b) => a.daysUntilDue - b.daysUntilDue),
    };
  },
});

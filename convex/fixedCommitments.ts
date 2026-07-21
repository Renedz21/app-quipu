import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  computeAllCommitmentCoverage,
  computeCoverageProgressPercent,
  daysUntilDueDay,
  mapCoverageStatusToDashboard,
} from "./lib/commitmentCoverage";

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

    return await ctx.db.insert("fixedCommitments", {
      profileId: profile._id,
      name,
      amount: args.amount,
      envelope: args.envelope,
      dueDay: args.dueDay,
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
    for (let i = 0; i < args.commitments.length; i++) {
      const c = args.commitments[i]!;
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
    for (const c of args.commitments) {
      const id = await ctx.db.insert("fixedCommitments", {
        profileId: args.profileId,
        name: c.name.trim(),
        amount: c.amount,
        envelope: c.envelope,
        dueDay: c.dueDay,
      });
      ids.push(id);
    }
    return ids;
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
      return {
        cycleId: null,
        commitments: commitments.map((commitment) => ({
          id: commitment._id,
          name: commitment.name,
          amount: commitment.amount,
          envelope: commitment.envelope,
          dueDay: commitment.dueDay,
          daysUntilDue: daysUntilDueDay(commitment.dueDay, now),
          covered: 0,
          remaining: commitment.amount,
          progressPercent: 0,
          coverageStatus: "uncovered" as const,
          cascadeStatus: "not-started" as const,
          fundingEvents: [],
          coveredAt: commitment.coveredAt,
        })),
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

    return {
      cycleId: activeCycle._id,
      commitments: commitments
        .map((commitment) => {
          const coverage = coverageById.get(commitment._id);
          const covered = coverage?.covered ?? 0;
          const remaining = coverage?.remaining ?? commitment.amount;
          const cascadeStatus = coverage?.status ?? "not-started";

          return {
            id: commitment._id,
            name: commitment.name,
            amount: commitment.amount,
            envelope: commitment.envelope,
            dueDay: commitment.dueDay,
            daysUntilDue: daysUntilDueDay(commitment.dueDay, now),
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
          };
        })
        .sort((a, b) => a.daysUntilDue - b.daysUntilDue),
    };
  },
});

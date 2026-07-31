import { ConvexError, v } from "convex/values";
import {
  applyDistributionPolicy,
  type DistributionPolicy,
} from "../shared/lib/allocations";
import { validateAllocationPlan } from "../shared/lib/incomeAllocation";
import type { Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import { persistIncomeAllocation } from "./lib/applyIncomeAllocation";
import { CYCLE_DAYS, ENVELOPE_TYPES } from "./lib/budgetMath";
import { sumActiveReservedCents } from "./lib/commitmentReservation";
import {
  computeCycleDayMetrics,
  computeDisplayDailyCents,
} from "./lib/dashboardMath";
import { evaluateClosedCycle } from "./lib/evaluateClosedCycle";
import {
  clearCommitmentCoverageForProfile,
  evaluateCommitmentCoverageForCycle,
} from "./lib/evaluateCommitmentCoverage";
import {
  canonicalExtraordinaryDescription,
  type ExtraordinaryType,
  sourceForExtraordinaryType,
} from "./lib/extraordinaryIncome";
import { resolveExtraordinaryIncomePolicy } from "./lib/extraordinaryRules";
import type { AllocationPlan } from "./lib/incomeAllocation";
import { planIncomeDeleteLedgerReverse } from "./lib/incomeDeleteReverse";
import { resolveCycleForEvent } from "./lib/incomeEventLogic";
import { computeDistributableCents, validateHeldCents } from "./lib/incomeHold";
import { computeSpendableSnapshot } from "./lib/spendableBalance";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const HORIZON_DAYS = 15; // v2.5 initial: fixed at 15 for variable income model.

const extraordinaryTypeValidator = v.union(
  v.literal("gratification_july"),
  v.literal("gratification_december"),
  v.literal("cts"),
  v.literal("corporate_bonus"),
  v.literal("profit_sharing"),
  v.literal("custom"),
);

const distributionPolicyValidator = v.union(
  v.literal("profile_default"),
  v.literal("all_to_savings"),
);

const allocationPlanValidator = v.object({
  reservations: v.array(
    v.object({
      commitmentId: v.id("fixedCommitments"),
      amountCents: v.number(),
    }),
  ),
  envelopes: v.object({
    needs: v.number(),
    wants: v.number(),
    savings: v.number(),
  }),
  savingsContributions: v.array(
    v.object({
      amountCents: v.number(),
      kind: v.union(v.literal("objective"), v.literal("additional")),
      subEnvelopeId: v.optional(v.id("subEnvelopes")),
    }),
  ),
  leaveUnallocatedCents: v.number(),
});

export const createIncomeEvent = mutation({
  args: {
    amount: v.number(),
    source: v.union(
      v.literal("payroll"),
      v.literal("freelance"),
      v.literal("business"),
      v.literal("gift"),
      v.literal("refund"),
      v.literal("investment"),
      v.literal("other"),
    ),
    description: v.string(),
    occurredAt: v.number(),
    incomeKind: v.optional(
      v.union(v.literal("habitual"), v.literal("extraordinary")),
    ),
    extraordinaryType: v.optional(extraordinaryTypeValidator),
    extraordinaryLabel: v.optional(v.string()),
    distributionPolicy: v.optional(distributionPolicyValidator),
    // P3-4: optional hold before 50/30/20. Integer cents, 0..amount.
    // Ignored when `allocation` is provided (reservations replace heldCents).
    heldCents: v.optional(v.number()),
    // Explicit distribution plan. When set, replaces auto 50/30/20 + heldCents.
    allocation: v.optional(allocationPlanValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión con tu Passkey o credencial.",
      });
    }
    if (!Number.isInteger(args.amount) || args.amount <= 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "El monto debe ser un entero de céntimos mayor a cero.",
        data: { field: "amount" },
      });
    }

    const explicitAllocation = args.allocation;
    if (explicitAllocation) {
      const validated = validateAllocationPlan(args.amount, {
        reservations: explicitAllocation.reservations.map((row) => ({
          commitmentId: row.commitmentId,
          amountCents: row.amountCents,
        })),
        envelopes: explicitAllocation.envelopes,
        savingsContributions: explicitAllocation.savingsContributions.map(
          (row) => ({
            amountCents: row.amountCents,
            kind: row.kind,
            subEnvelopeId: row.subEnvelopeId,
          }),
        ),
        leaveUnallocatedCents: explicitAllocation.leaveUnallocatedCents,
      });
      if (!validated.ok) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: validated.message,
          data: { field: "allocation" },
        });
      }
    }

    const heldCents = explicitAllocation
      ? explicitAllocation.reservations.reduce(
          (sum, row) => sum + row.amountCents,
          0,
        )
      : (args.heldCents ?? 0);
    if (!explicitAllocation && heldCents !== 0) {
      const holdError = validateHeldCents(args.amount, heldCents);
      if (holdError) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: holdError,
          data: { field: "heldCents" },
        });
      }
    }

    const distributableCents = explicitAllocation
      ? explicitAllocation.envelopes.needs +
        explicitAllocation.envelopes.wants +
        explicitAllocation.envelopes.savings
      : computeDistributableCents(args.amount, heldCents);

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

    const incomeKind = args.incomeKind ?? "habitual";
    let resolvedSource = args.source;
    let resolvedDescription = "";
    let distributionPolicy: DistributionPolicy = "profile_default";
    let extraordinaryType: ExtraordinaryType | undefined;
    let extraordinaryLabel: string | undefined;
    let appliedByAutoRule = false;

    if (incomeKind === "extraordinary") {
      if (!args.extraordinaryType) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "Elige un tipo de ingreso extraordinario.",
          data: { field: "extraordinaryType" },
        });
      }
      extraordinaryType = args.extraordinaryType;
      if (extraordinaryType === "custom") {
        const label = args.extraordinaryLabel?.trim() ?? "";
        if (!label || label.length > 80) {
          throw new ConvexError({
            code: "VALIDATION_ERROR",
            message:
              "Describe el ingreso (1–80 caracteres) para «Otro extraordinario».",
            data: { field: "extraordinaryLabel" },
          });
        }
        extraordinaryLabel = label;
      } else if (args.extraordinaryLabel?.trim()) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message:
            "La etiqueta personalizada solo aplica a «Otro extraordinario».",
          data: { field: "extraordinaryLabel" },
        });
      }

      const resolved = resolveExtraordinaryIncomePolicy({
        isPremium: profile.plan === "premium",
        extraordinaryType,
        rules: profile.extraordinaryRules,
        autoApply: profile.extraordinaryRulesAutoApply,
        distributionPolicy: args.distributionPolicy,
      });
      if (!resolved.ok) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "Confirma a dónde va este ingreso extraordinario.",
          data: { field: "distributionPolicy" },
        });
      }
      distributionPolicy = resolved.distributionPolicy;
      appliedByAutoRule = resolved.appliedByAutoRule;
      resolvedSource = sourceForExtraordinaryType(extraordinaryType);
      resolvedDescription = canonicalExtraordinaryDescription(
        extraordinaryType,
        extraordinaryLabel,
      );
    } else {
      const description = args.description.trim();
      if (!description) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "La descripción es obligatoria.",
          data: { field: "description" },
        });
      }
      resolvedDescription = description;
      if (
        args.extraordinaryType !== undefined ||
        args.distributionPolicy !== undefined ||
        args.extraordinaryLabel !== undefined
      ) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message:
            "Los campos extraordinarios solo aplican a ingresos extraordinarios.",
        });
      }
    }

    const now = Date.now();
    const activeCycle = await ctx.db
      .query("financialCycles")
      .withIndex("by_profile_status", (q) =>
        q.eq("profileId", profile._id).eq("status", "active"),
      )
      .unique();

    // Resolve which cycle the event belongs to.
    const resolvedId = resolveCycleForEvent({
      activeCycle: activeCycle
        ? {
            _id: activeCycle._id,
            startDate: activeCycle.startDate,
            endDate: activeCycle.endDate,
          }
        : null,
      occurredAt: args.occurredAt,
      now,
    });

    let cycleId: Id<"financialCycles">;
    let isNewCycle = false;

    if (resolvedId && activeCycle && resolvedId === activeCycle._id) {
      cycleId = activeCycle._id;
    } else {
      // Close the previous active cycle (if any) and open a new one.
      if (activeCycle) {
        await evaluateClosedCycle(ctx, profile._id, activeCycle._id, now);
        await ctx.db.patch(activeCycle._id, { status: "closed" });
      }
      // Compute the new cycle's window.
      let cycleDays: number;
      if (profile.incomeModel === "variable") {
        cycleDays = profile.cycleDurationDays ?? HORIZON_DAYS;
      } else {
        // fixed or mixed
        const freq = profile.payFrequency;
        if (!freq) {
          throw new ConvexError({
            code: "VALIDATION_ERROR",
            message:
              "El perfil tiene incomeModel fijo/mixto pero no payFrequency configurado.",
          });
        }
        cycleDays = CYCLE_DAYS[freq];
      }
      const startDate = args.occurredAt;
      const endDate = startDate + cycleDays * MS_PER_DAY;
      cycleId = await ctx.db.insert("financialCycles", {
        profileId: profile._id,
        startDate,
        endDate,
        status: "active",
        totalIncomeReceived: 0,
      });
      isNewCycle = true;
      await clearCommitmentCoverageForProfile(ctx, profile._id);
    }

    const weights = {
      allocationNeeds: profile.allocationNeeds,
      allocationWants: profile.allocationWants,
      allocationSavings: profile.allocationSavings,
    };

    const distribution = explicitAllocation
      ? { ...explicitAllocation.envelopes }
      : applyDistributionPolicy(
          distributableCents,
          weights,
          distributionPolicy,
        );

    const eventId = await ctx.db.insert("incomeEvents", {
      profileId: profile._id,
      cycleId,
      amount: args.amount,
      source: resolvedSource,
      description: resolvedDescription,
      occurredAt: args.occurredAt,
      incomeKind,
      ...(extraordinaryType !== undefined && {
        extraordinaryType,
        extraordinaryLabel,
        distributionPolicy,
        ...(appliedByAutoRule && { appliedByAutoRule: true }),
      }),
      ...(heldCents > 0 && { heldCents }),
      distributionApplied: distribution,
    });

    const emergencyFund = (
      await ctx.db
        .query("subEnvelopes")
        .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
        .collect()
    ).find((row) => row.isSystemDefault);

    let addedUnallocated = 0;
    if (explicitAllocation) {
      const plan: AllocationPlan = {
        reservations: explicitAllocation.reservations.map((row) => ({
          commitmentId: row.commitmentId,
          amountCents: row.amountCents,
        })),
        envelopes: explicitAllocation.envelopes,
        savingsContributions: explicitAllocation.savingsContributions.map(
          (row) => ({
            amountCents: row.amountCents,
            kind: row.kind,
            subEnvelopeId: row.subEnvelopeId,
          }),
        ),
        leaveUnallocatedCents: explicitAllocation.leaveUnallocatedCents,
      };
      try {
        const persisted = await persistIncomeAllocation(ctx, {
          profileId: profile._id,
          cycleId,
          incomeEventId: eventId,
          amountCents: args.amount,
          plan,
          now,
          emergencyFundId: emergencyFund?._id,
        });
        addedUnallocated = persisted.unallocatedCents;
      } catch (error) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "No se pudo aplicar la distribución.",
          data: { field: "allocation" },
        });
      }
    } else {
      // Legacy auto-split: persist envelope lines only (no invented additional).
      // heldCents remains event-level for cascade coverage; not unallocated.
      for (const type of ENVELOPE_TYPES) {
        const amountCents = distribution[type];
        if (amountCents <= 0) continue;
        await ctx.db.insert("incomeAllocationLines", {
          profileId: profile._id,
          cycleId,
          incomeEventId: eventId,
          destination:
            type === "needs"
              ? "envelope_needs"
              : type === "wants"
                ? "envelope_wants"
                : "envelope_savings",
          amountCents,
          createdAt: now,
        });
      }
    }

    // Update or seed envelopes.
    const envelopes = await ctx.db
      .query("envelopes")
      .withIndex("by_cycle_type", (q) => q.eq("cycleId", cycleId))
      .collect();

    if (envelopes.length === 0) {
      await Promise.all([
        ctx.db.insert("envelopes", {
          profileId: profile._id,
          cycleId,
          type: "needs",
          allocatedAmount: distribution.needs,
          remainingAmount: distribution.needs,
        }),
        ctx.db.insert("envelopes", {
          profileId: profile._id,
          cycleId,
          type: "wants",
          allocatedAmount: distribution.wants,
          remainingAmount: distribution.wants,
        }),
        ctx.db.insert("envelopes", {
          profileId: profile._id,
          cycleId,
          type: "savings",
          allocatedAmount: distribution.savings,
          remainingAmount: distribution.savings,
        }),
      ]);
    } else {
      await Promise.all(
        envelopes.map((env) =>
          ctx.db.patch(env._id, {
            allocatedAmount: env.allocatedAmount + distribution[env.type],
            remainingAmount: env.remainingAmount + distribution[env.type],
          }),
        ),
      );
    }

    const cycle = await ctx.db.get(cycleId);
    if (!cycle) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Ciclo no encontrado tras insert.",
      });
    }
    await ctx.db.patch(cycle._id, {
      totalIncomeReceived: cycle.totalIncomeReceived + args.amount,
      unallocatedCents: (cycle.unallocatedCents ?? 0) + addedUnallocated,
    });

    await evaluateCommitmentCoverageForCycle(ctx, profile._id, cycleId, now);

    const updatedEnvelopes = await ctx.db
      .query("envelopes")
      .withIndex("by_cycle_type", (q) => q.eq("cycleId", cycleId))
      .collect();
    const updatedCycle = await ctx.db.get(cycleId);
    if (!updatedCycle) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Ciclo no encontrado tras actualizar sobres.",
      });
    }

    const cycleMetrics = computeCycleDayMetrics(
      updatedCycle.startDate,
      updatedCycle.endDate,
      now,
    );
    const needsEnvelope = updatedEnvelopes.find((env) => env.type === "needs");
    const wantsEnvelope = updatedEnvelopes.find((env) => env.type === "wants");
    const savingsEnvelope = updatedEnvelopes.find(
      (env) => env.type === "savings",
    );
    const reservations = await ctx.db
      .query("commitmentReservations")
      .withIndex("by_cycle", (q) => q.eq("cycleId", cycleId))
      .collect();
    const spendable = computeSpendableSnapshot({
      needsRemainingCents: needsEnvelope?.remainingAmount ?? 0,
      wantsRemainingCents: wantsEnvelope?.remainingAmount ?? 0,
      savingsRemainingCents: savingsEnvelope?.remainingAmount ?? 0,
      unallocatedCents: updatedCycle.unallocatedCents ?? 0,
      activeReservedCents: sumActiveReservedCents(reservations),
      daysRemaining: cycleMetrics.daysRemaining,
    });

    return {
      eventId,
      cycleId,
      isNewCycle,
      amount: args.amount,
      heldCents,
      distributableCents,
      unallocatedCents: updatedCycle.unallocatedCents ?? 0,
      reservedCents: spendable.reservedCents,
      spendableCents: spendable.spendableCents,
      source: resolvedSource,
      description: resolvedDescription,
      distributionApplied: distribution,
      envelopes: ENVELOPE_TYPES.map((type) => {
        const envelope = updatedEnvelopes.find((env) => env.type === type);
        return {
          type,
          remainingAmount: envelope?.remainingAmount ?? 0,
          allocatedAmount: envelope?.allocatedAmount ?? 0,
          delta: distribution[type],
        };
      }),
      displayDailyCents: computeDisplayDailyCents(
        spendable.dailyAvailableCents,
      ),
    };
  },
});

export const updateIncomeEvent = mutation({
  args: {
    eventId: v.id("incomeEvents"),
    amount: v.number(),
    source: v.union(
      v.literal("payroll"),
      v.literal("freelance"),
      v.literal("business"),
      v.literal("gift"),
      v.literal("refund"),
      v.literal("investment"),
      v.literal("other"),
    ),
    description: v.string(),
    occurredAt: v.number(),
    incomeKind: v.optional(
      v.union(v.literal("habitual"), v.literal("extraordinary")),
    ),
    extraordinaryType: v.optional(extraordinaryTypeValidator),
    extraordinaryLabel: v.optional(v.string()),
    distributionPolicy: v.optional(distributionPolicyValidator),
    heldCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión con tu Passkey o credencial.",
      });
    }
    if (!Number.isInteger(args.amount) || args.amount <= 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "El monto debe ser un entero de céntimos mayor a cero.",
        data: { field: "amount" },
      });
    }

    const incomeKind = args.incomeKind ?? "habitual";
    let resolvedSource = args.source;
    let resolvedDescription = "";
    let distributionPolicy: DistributionPolicy = "profile_default";
    let extraordinaryType: ExtraordinaryType | undefined;
    let extraordinaryLabel: string | undefined;
    let appliedByAutoRule = false;

    if (incomeKind === "extraordinary") {
      if (!args.extraordinaryType) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "Elige un tipo de ingreso extraordinario.",
          data: { field: "extraordinaryType" },
        });
      }
      extraordinaryType = args.extraordinaryType;
      if (extraordinaryType === "custom") {
        const label = args.extraordinaryLabel?.trim() ?? "";
        if (!label || label.length > 80) {
          throw new ConvexError({
            code: "VALIDATION_ERROR",
            message:
              "Describe el ingreso (1–80 caracteres) para «Otro extraordinario».",
            data: { field: "extraordinaryLabel" },
          });
        }
        extraordinaryLabel = label;
      } else if (args.extraordinaryLabel?.trim()) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message:
            "La etiqueta personalizada solo aplica a «Otro extraordinario».",
          data: { field: "extraordinaryLabel" },
        });
      }
      resolvedSource = sourceForExtraordinaryType(extraordinaryType);
      resolvedDescription = canonicalExtraordinaryDescription(
        extraordinaryType,
        extraordinaryLabel,
      );
    } else {
      const description = args.description.trim();
      if (!description) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "La descripción es obligatoria.",
          data: { field: "description" },
        });
      }
      resolvedDescription = description;
      if (
        args.extraordinaryType !== undefined ||
        args.distributionPolicy !== undefined ||
        args.extraordinaryLabel !== undefined
      ) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message:
            "Los campos extraordinarios solo aplican a ingresos extraordinarios.",
        });
      }
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "El ingreso no existe.",
      });
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!profile || event.profileId !== profile._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "No tienes permisos para editar este registro.",
      });
    }

    if (incomeKind === "extraordinary" && extraordinaryType) {
      const resolved = resolveExtraordinaryIncomePolicy({
        isPremium: profile.plan === "premium",
        extraordinaryType,
        rules: profile.extraordinaryRules,
        autoApply: profile.extraordinaryRulesAutoApply,
        distributionPolicy: args.distributionPolicy,
      });
      if (!resolved.ok) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "Confirma a dónde va este ingreso extraordinario.",
          data: { field: "distributionPolicy" },
        });
      }
      distributionPolicy = resolved.distributionPolicy;
      appliedByAutoRule = resolved.appliedByAutoRule;
    }

    const cycle = await ctx.db.get(event.cycleId);
    if (cycle?.status !== "active") {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Solo puedes editar ingresos del ciclo activo.",
      });
    }

    const now = Date.now();

    // Reject occurredAt outside the cycle window or in the future.
    if (args.occurredAt < cycle.startDate) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "La fecha del ingreso debe estar dentro del ciclo activo.",
        data: { field: "occurredAt" },
      });
    }
    if (args.occurredAt > now) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "La fecha del ingreso no puede ser futura.",
        data: { field: "occurredAt" },
      });
    }

    const heldCents = args.heldCents ?? event.heldCents ?? 0;
    if (heldCents !== 0) {
      const holdError = validateHeldCents(args.amount, heldCents);
      if (holdError) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: holdError,
          data: { field: "heldCents" },
        });
      }
    }
    const distributableCents = computeDistributableCents(
      args.amount,
      heldCents,
    );

    const weights = {
      allocationNeeds: profile.allocationNeeds,
      allocationWants: profile.allocationWants,
      allocationSavings: profile.allocationSavings,
    };
    const newDistribution = applyDistributionPolicy(
      distributableCents,
      weights,
      distributionPolicy,
    );
    const oldDistribution = event.distributionApplied;

    // Delta-patch envelopes for this event only.
    const envelopes = await ctx.db
      .query("envelopes")
      .withIndex("by_cycle_type", (q) => q.eq("cycleId", event.cycleId))
      .collect();

    await Promise.all(
      envelopes.map((env) => {
        const delta = newDistribution[env.type] - oldDistribution[env.type];
        return ctx.db.patch(env._id, {
          allocatedAmount: env.allocatedAmount + delta,
          remainingAmount: env.remainingAmount + delta,
        });
      }),
    );

    // Delta-patch the cycle's total income.
    const amountDelta = args.amount - event.amount;
    await ctx.db.patch(cycle._id, {
      totalIncomeReceived: cycle.totalIncomeReceived + amountDelta,
      // Editing income can leave envelopes inconsistent with real cash; nudge review.
      needsReview: true,
    });

    // Patch the event document.
    await ctx.db.patch(args.eventId, {
      amount: args.amount,
      source: resolvedSource,
      description: resolvedDescription,
      occurredAt: args.occurredAt,
      incomeKind,
      distributionApplied: newDistribution,
      updatedAt: now,
      ...(heldCents > 0 ? { heldCents } : { heldCents: undefined }),
      ...(incomeKind === "extraordinary" && extraordinaryType !== undefined
        ? {
            extraordinaryType,
            extraordinaryLabel,
            distributionPolicy,
            ...(appliedByAutoRule
              ? { appliedByAutoRule: true }
              : { appliedByAutoRule: undefined }),
          }
        : {
            extraordinaryType: undefined,
            extraordinaryLabel: undefined,
            distributionPolicy: undefined,
            appliedByAutoRule: undefined,
          }),
    });

    await evaluateCommitmentCoverageForCycle(
      ctx,
      profile._id,
      event.cycleId,
      now,
    );

    return { success: true };
  },
});

export const deleteIncomeEvent = mutation({
  args: { eventId: v.id("incomeEvents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión con tu Passkey o credencial.",
      });
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "El ingreso no existe.",
      });
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!profile || event.profileId !== profile._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "No tienes permisos para eliminar este registro.",
      });
    }

    const cycle = await ctx.db.get(event.cycleId);
    if (cycle?.status !== "active") {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Solo puedes eliminar ingresos del ciclo activo.",
      });
    }

    // Reverse the distribution on envelopes.
    const envelopes = await ctx.db
      .query("envelopes")
      .withIndex("by_cycle_type", (q) => q.eq("cycleId", cycle._id))
      .collect();
    await Promise.all(
      envelopes.map((env) =>
        ctx.db.patch(env._id, {
          allocatedAmount:
            env.allocatedAmount - event.distributionApplied[env.type],
          remainingAmount:
            env.remainingAmount - event.distributionApplied[env.type],
        }),
      ),
    );

    // Reverse allocation ledger (unallocated, reservations, confirmed contributions).
    const allocationLines = await ctx.db
      .query("incomeAllocationLines")
      .withIndex("by_income_event", (q) => q.eq("incomeEventId", args.eventId))
      .collect();
    const reversePlan = planIncomeDeleteLedgerReverse(
      allocationLines.map((line) => ({
        destination: line.destination,
        amountCents: line.amountCents,
        reservationId: line.reservationId,
        subEnvelopeId: line.subEnvelopeId,
        contributionKind: line.contributionKind,
      })),
    );

    const now = Date.now();
    for (const reservationId of reversePlan.reservationIdsToRelease) {
      const reservation = await ctx.db.get(reservationId);
      if (!reservation) continue;
      const active =
        reservation.reservedCents -
        reservation.consumedCents -
        reservation.releasedCents;
      await ctx.db.patch(reservationId, {
        status: "released",
        releasedCents: reservation.releasedCents + Math.max(0, active),
        updatedAt: now,
      });
      await ctx.db.insert("internalTransfers", {
        profileId: profile._id,
        cycleId: cycle._id,
        kind: "reservation_release",
        amountCents: Math.max(0, active),
        from: `reservation:${reservationId}`,
        to: "deleted_income",
        note: "Reverso por eliminación de ingreso",
        createdAt: now,
      });
    }

    for (const reversal of reversePlan.subEnvelopeReversals) {
      const sub = await ctx.db.get(reversal.subEnvelopeId);
      if (!sub) continue;
      await ctx.db.patch(reversal.subEnvelopeId, {
        currentAmount: Math.max(0, sub.currentAmount - reversal.amountCents),
      });
    }

    for (const line of allocationLines) {
      await ctx.db.delete(line._id);
    }

    const remainingIncomes = await ctx.db
      .query("incomeEvents")
      .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
      .collect();
    const otherIncomes = remainingIncomes.filter(
      (row) => row._id !== args.eventId,
    );

    // Reverse the cycle's total + unallocated from this event.
    await ctx.db.patch(cycle._id, {
      totalIncomeReceived: Math.max(
        0,
        cycle.totalIncomeReceived - event.amount,
      ),
      unallocatedCents: Math.max(
        0,
        (cycle.unallocatedCents ?? 0) - reversePlan.unallocatedDeltaCents,
      ),
      // If other incomes remain, ask the user to review; empty cycle is fine.
      needsReview: otherIncomes.length > 0 ? true : false,
    });

    await ctx.db.delete(args.eventId);

    await evaluateCommitmentCoverageForCycle(ctx, profile._id, cycle._id, now);

    return { success: true };
  },
});

import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  buildMonthsCoveredCopy,
  computeCyclesToComplete,
  computeEmergencyFundTargetCents,
  computeMonthlyEssentialsCents,
  computeMonthsCovered,
  computeProgressPercent,
  computeRemainingToTarget,
  MAX_SAVINGS_GOALS,
  resolveEmergencyFundTargetCents,
} from "./lib/savingsMath";

function mapGoal(subEnvelope: Doc<"subEnvelopes">) {
  const targetAmount = subEnvelope.targetAmount ?? 0;
  return {
    id: subEnvelope._id,
    label: subEnvelope.label,
    currentAmount: subEnvelope.currentAmount,
    targetAmount: subEnvelope.targetAmount,
    progressPercent: computeProgressPercent(
      subEnvelope.currentAmount,
      targetAmount,
    ),
    isSystemDefault: subEnvelope.isSystemDefault,
  };
}

function buildEmergencyFundPayload({
  emergencyFund,
  monthlyEssentialsCents,
  cycleContributionCents,
  contributionStreak,
  availableToContributeCents,
}: {
  emergencyFund: Doc<"subEnvelopes">;
  monthlyEssentialsCents: number;
  cycleContributionCents: number;
  contributionStreak: number;
  availableToContributeCents: number;
}) {
  const computedTargetCents = computeEmergencyFundTargetCents(
    monthlyEssentialsCents,
  );
  const targetCents = resolveEmergencyFundTargetCents(
    emergencyFund.targetAmount,
    computedTargetCents,
  );
  const monthsCovered = computeMonthsCovered(
    emergencyFund.currentAmount,
    monthlyEssentialsCents,
  );
  const remainingCents = computeRemainingToTarget(
    emergencyFund.currentAmount,
    targetCents,
  );
  const cyclesToComplete = computeCyclesToComplete(
    remainingCents,
    cycleContributionCents,
  );

  return {
    id: emergencyFund._id,
    label: emergencyFund.label,
    currentAmount: emergencyFund.currentAmount,
    targetAmount: targetCents,
    monthlyEssentialsCents,
    monthsCovered,
    monthsCoveredCopy: buildMonthsCoveredCopy(monthsCovered),
    progressPercent: computeProgressPercent(
      emergencyFund.currentAmount,
      targetCents,
    ),
    cycleContributionCents,
    cyclesToComplete,
    contributionStreak,
    availableToContributeCents,
  };
}

async function buildSavingsOverview(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
    .unique();
  if (!profile) return null;

  const subEnvelopes = await ctx.db
    .query("subEnvelopes")
    .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
    .collect();

  const commitments = await ctx.db
    .query("fixedCommitments")
    .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
    .collect();

  const activeCycle = await ctx.db
    .query("financialCycles")
    .withIndex("by_profile_status", (q) =>
      q.eq("profileId", profile._id).eq("status", "active"),
    )
    .unique();

  let savingsEnvelopeRemaining = 0;
  let cycleContributionCents = 0;
  if (activeCycle) {
    const savingsEnvelope = await ctx.db
      .query("envelopes")
      .withIndex("by_cycle_type", (q) =>
        q.eq("cycleId", activeCycle._id).eq("type", "savings"),
      )
      .unique();
    savingsEnvelopeRemaining = Math.max(
      0,
      savingsEnvelope?.remainingAmount ?? 0,
    );
    cycleContributionCents = Math.max(0, savingsEnvelope?.allocatedAmount ?? 0);
  }

  const needsEnvelopeAllocated = activeCycle
    ? Math.max(
        0,
        (
          await ctx.db
            .query("envelopes")
            .withIndex("by_cycle_type", (q) =>
              q.eq("cycleId", activeCycle._id).eq("type", "needs"),
            )
            .unique()
        )?.allocatedAmount ?? 0,
      )
    : 0;

  const monthlyEssentialsCents = computeMonthlyEssentialsCents(
    commitments.filter((commitment) => commitment.envelope === "needs"),
    needsEnvelopeAllocated,
  );

  const streak = await ctx.db
    .query("streaks")
    .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
    .unique();

  const emergencyFund =
    subEnvelopes.find((subEnvelope) => subEnvelope.isSystemDefault) ??
    subEnvelopes[0];

  if (!emergencyFund) {
    return {
      profile: {
        name: profile.name,
        currencyCode: profile.currencyCode,
      },
      hasActiveCycle: Boolean(activeCycle),
      totalSavedCents: 0,
      cycleContributionCents,
      emergencyFund: null,
      goals: [],
      canCreateGoal: false,
    };
  }

  const goals = subEnvelopes
    .filter((subEnvelope) => !subEnvelope.isSystemDefault)
    .sort((a, b) => b.currentAmount - a.currentAmount)
    .slice(0, MAX_SAVINGS_GOALS)
    .map(mapGoal);

  const emergencyFundPayload = buildEmergencyFundPayload({
    emergencyFund,
    monthlyEssentialsCents,
    cycleContributionCents,
    contributionStreak: streak?.currentStreak ?? 0,
    availableToContributeCents: savingsEnvelopeRemaining,
  });

  const totalSavedCents = subEnvelopes.reduce(
    (sum, subEnvelope) => sum + subEnvelope.currentAmount,
    0,
  );

  return {
    profile: {
      name: profile.name,
      currencyCode: profile.currencyCode,
    },
    hasActiveCycle: Boolean(activeCycle),
    totalSavedCents,
    cycleContributionCents,
    emergencyFund: emergencyFundPayload,
    goals,
    canCreateGoal:
      subEnvelopes.filter((subEnvelope) => !subEnvelope.isSystemDefault)
        .length < MAX_SAVINGS_GOALS,
  };
}

async function executeContribution(
  ctx: MutationCtx,
  subEnvelopeId: Id<"subEnvelopes">,
  amountArg?: number,
) {
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

  const subEnvelope = await ctx.db.get(subEnvelopeId);
  if (!subEnvelope || subEnvelope.profileId !== profile._id) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Meta de ahorro no encontrada.",
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
      code: "NO_ACTIVE_CYCLE",
      message: "Registra un ingreso para activar tu ciclo antes de aportar.",
    });
  }

  const savingsEnvelope = await ctx.db
    .query("envelopes")
    .withIndex("by_cycle_type", (q) =>
      q.eq("cycleId", activeCycle._id).eq("type", "savings"),
    )
    .unique();
  if (!savingsEnvelope) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Sobre de ahorro no encontrado en el ciclo actual.",
    });
  }

  const available = Math.max(0, savingsEnvelope.remainingAmount);
  const amount = amountArg ?? available;

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "El aporte debe ser un entero de céntimos mayor a cero.",
      data: { field: "amount" },
    });
  }
  if (amount > available) {
    throw new ConvexError({
      code: "INSUFFICIENT_FUNDS",
      message: "No tienes suficiente apartado en Ahorro para este aporte.",
      data: {
        envelope: "savings",
        requested: amount,
        available,
      },
    });
  }

  await ctx.db.patch(savingsEnvelope._id, {
    remainingAmount: savingsEnvelope.remainingAmount - amount,
  });
  await ctx.db.patch(subEnvelope._id, {
    currentAmount: subEnvelope.currentAmount + amount,
  });

  return {
    subEnvelopeId: subEnvelope._id,
    amount,
    newCurrentAmount: subEnvelope.currentAmount + amount,
    savingsRemainingAmount: savingsEnvelope.remainingAmount - amount,
  };
}

export const getOverview = query({
  args: {},
  handler: async (ctx) => buildSavingsOverview(ctx),
});

export const getEmergencyFundDetail = query({
  args: {},
  handler: async (ctx) => {
    const overview = await buildSavingsOverview(ctx);
    if (!overview?.emergencyFund) return null;

    return {
      profile: overview.profile,
      hasActiveCycle: overview.hasActiveCycle,
      emergencyFund: overview.emergencyFund,
    };
  },
});

export const contributeToSubEnvelope = mutation({
  args: {
    subEnvelopeId: v.id("subEnvelopes"),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) =>
    executeContribution(ctx, args.subEnvelopeId, args.amount),
});

export const createSavingsGoal = mutation({
  args: {
    label: v.string(),
    targetAmount: v.optional(v.number()),
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

    const label = args.label.trim();
    if (!label) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "El nombre de la meta es obligatorio.",
        data: { field: "label" },
      });
    }
    if (label.length > 40) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "El nombre de la meta debe tener como máximo 40 caracteres.",
        data: { field: "label" },
      });
    }

    if (
      args.targetAmount !== undefined &&
      (!Number.isInteger(args.targetAmount) || args.targetAmount <= 0)
    ) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "La meta debe ser un entero de céntimos mayor a cero.",
        data: { field: "targetAmount" },
      });
    }

    const existingGoals = await ctx.db
      .query("subEnvelopes")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .collect();

    const customGoals = existingGoals.filter(
      (subEnvelope) => !subEnvelope.isSystemDefault,
    );
    if (customGoals.length >= MAX_SAVINGS_GOALS) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message:
          "Ya tienes el máximo de metas visibles. Cierra una antes de crear otra.",
      });
    }

    const duplicate = customGoals.some(
      (goal) => goal.label.toLowerCase() === label.toLowerCase(),
    );
    if (duplicate) {
      throw new ConvexError({
        code: "ALREADY_EXISTS",
        message: "Ya tienes una meta con ese nombre.",
      });
    }

    const goalId = await ctx.db.insert("subEnvelopes", {
      profileId: profile._id,
      parentEnvelopeType: "savings",
      label,
      emoji: "",
      currentAmount: 0,
      targetAmount: args.targetAmount,
      isSystemDefault: false,
    });

    return { goalId };
  },
});

export const contributeToGoal = mutation({
  args: {
    goalId: v.id("subEnvelopes"),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) =>
    executeContribution(ctx, args.goalId, args.amount),
});

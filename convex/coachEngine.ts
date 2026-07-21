import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { suggestRescueTransfer } from "./lib/budgetMath";
import {
  resolveCoachPresentation,
  WANTS_OVERFLOW_EVENT,
} from "./lib/coachState";
import {
  computeRescueEnvelopePatches,
  validateRescueTransferApply,
} from "./lib/rescueTransfer";

export { resolveCoachPresentation, WANTS_OVERFLOW_EVENT };

const FREEZE_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

async function getOwnedPendingInteraction(
  ctx: MutationCtx,
  interactionId: Id<"coachInteractions">,
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Debes iniciar sesión con tu Passkey o credencial.",
    });
  }

  const interaction = await ctx.db.get(interactionId);
  if (!interaction || interaction.status !== "pending") {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "La interacción no existe o ya fue resuelta.",
    });
  }

  const profile = await ctx.db.get(interaction.profileId);
  if (!profile || profile.userId !== identity.subject) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "No tienes permisos para modificar este registro.",
    });
  }

  return { interaction, profile };
}

async function getCycleEnvelopes(
  ctx: MutationCtx,
  cycleId: Id<"financialCycles">,
) {
  const [savings, wants] = await Promise.all([
    ctx.db
      .query("envelopes")
      .withIndex("by_cycle_type", (q) =>
        q.eq("cycleId", cycleId).eq("type", "savings"),
      )
      .unique(),
    ctx.db
      .query("envelopes")
      .withIndex("by_cycle_type", (q) =>
        q.eq("cycleId", cycleId).eq("type", "wants"),
      )
      .unique(),
  ]);

  return { savings, wants };
}

function buildRescueConfirmMessage(
  transfer: number,
  projectedDeficit: number,
  currencySymbol: string,
): string {
  const transferAmount = (transfer / 100).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const deficitAmount = (projectedDeficit / 100).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Te sugiero transferir ${currencySymbol} ${transferAmount} de Ahorro a Gustos para cubrir ${currencySymbol} ${deficitAmount} de déficit. Confirma para aplicar.`;
}

export const getActiveNudge = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!profile) return null;

    return await ctx.db
      .query("coachInteractions")
      .withIndex("by_profile_status", (q) =>
        q.eq("profileId", profile._id).eq("status", "pending"),
      )
      .order("desc")
      .first();
  },
});

export const resolveNudgeAction = mutation({
  args: {
    interactionId: v.id("coachInteractions"),
    optionId: v.union(
      v.literal("freeze_wants"),
      v.literal("suggest_rescue"),
      v.literal("ignore"),
    ),
  },
  handler: async (ctx, { interactionId, optionId }) => {
    const { interaction, profile } = await getOwnedPendingInteraction(
      ctx,
      interactionId,
    );

    if (!interaction.options.some((o) => o.id === optionId)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Opción inválida.",
      });
    }

    if (optionId === "suggest_rescue" && profile.plan === "free") {
      await ctx.db.patch(interactionId, {
        selectedOptionId: optionId,
        status: "resolved",
        initialNudge:
          "[Plan Free] El Coach te aconseja: reduce S/ 15 diarios en tus consumos de Gustos por 4 días para equilibrar el sobre sin tocar tus ahorros.",
      });
      return { success: true, mode: "free_advice" as const };
    }

    if (optionId === "suggest_rescue") {
      const { savings, wants } = await getCycleEnvelopes(ctx, interaction.cycleId);

      if (!savings || !wants) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "No se encontraron los sobres del ciclo actual.",
        });
      }

      const suggestion = suggestRescueTransfer(
        savings.remainingAmount,
        wants.remainingAmount,
      );

      if (suggestion.transfer <= 0) {
        await ctx.db.patch(interactionId, {
          selectedOptionId: optionId,
          status: "resolved",
          initialNudge:
            "Por ahora no hay un rescate disponible: tu sobre de Gustos no está en déficit o no hay saldo en Ahorro para transferir.",
        });
        return { success: true, mode: "unavailable" as const };
      }

      await ctx.db.patch(interactionId, {
        selectedOptionId: optionId,
        rescueSuggestion: suggestion,
        initialNudge: buildRescueConfirmMessage(
          suggestion.transfer,
          suggestion.projectedDeficit,
          profile.currencySymbol,
        ),
      });

      return {
        success: true,
        mode: "suggested" as const,
        suggestion,
      };
    }

    if (optionId === "freeze_wants") {
      const { wants } = await getCycleEnvelopes(ctx, interaction.cycleId);
      if (wants) {
        await ctx.db.patch(wants._id, {
          frozenUntil: Date.now() + FREEZE_DURATION_MS,
        });
      }
    }

    await ctx.db.patch(interactionId, {
      selectedOptionId: optionId,
      status: "resolved",
    });
    return { success: true, mode: "executed" as const };
  },
});

export const applyRescueTransfer = mutation({
  args: {
    interactionId: v.id("coachInteractions"),
  },
  handler: async (ctx, { interactionId }) => {
    const { interaction, profile } = await getOwnedPendingInteraction(
      ctx,
      interactionId,
    );

    if (
      interaction.selectedOptionId !== "suggest_rescue" ||
      !interaction.rescueSuggestion
    ) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Esta interacción no tiene una sugerencia de rescate pendiente.",
      });
    }

    const { savings, wants } = await getCycleEnvelopes(ctx, interaction.cycleId);
    if (!savings || !wants) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No se encontraron los sobres del ciclo actual.",
      });
    }

    const validation = validateRescueTransferApply(interaction.rescueSuggestion, {
      savingsRemaining: savings.remainingAmount,
      wantsRemaining: wants.remainingAmount,
    });

    if (!validation.ok) {
      const messageByReason: Record<typeof validation.reason, string> = {
        NO_SUGGESTION: "No hay una sugerencia de rescate válida.",
        INVALID_TRANSFER: "El monto de rescate no es válido.",
        INSUFFICIENT_SAVINGS:
          "Ya no hay saldo suficiente en Ahorro para este rescate.",
        NO_RESCUE_NEEDED: "Tu sobre de Gustos ya no necesita rescate.",
      };
      throw new ConvexError({
        code:
          validation.reason === "INSUFFICIENT_SAVINGS"
            ? "INSUFFICIENT_FUNDS"
            : "VALIDATION_ERROR",
        message: messageByReason[validation.reason],
      });
    }

    const patches = computeRescueEnvelopePatches(
      {
        savingsRemaining: savings.remainingAmount,
        wantsRemaining: wants.remainingAmount,
      },
      validation.transfer,
    );

    await ctx.db.patch(savings._id, {
      remainingAmount: patches.savingsRemaining,
    });
    await ctx.db.patch(wants._id, {
      remainingAmount: patches.wantsRemaining,
    });
    await ctx.db.patch(interactionId, {
      status: "applied",
    });

    return {
      success: true,
      transfer: validation.transfer,
      savingsRemaining: patches.savingsRemaining,
      wantsRemaining: patches.wantsRemaining,
    };
  },
});

export const dismissRescueSuggestion = mutation({
  args: {
    interactionId: v.id("coachInteractions"),
  },
  handler: async (ctx, { interactionId }) => {
    const { interaction } = await getOwnedPendingInteraction(ctx, interactionId);

    if (
      interaction.selectedOptionId !== "suggest_rescue" ||
      !interaction.rescueSuggestion
    ) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Esta interacción no tiene una sugerencia de rescate pendiente.",
      });
    }

    await ctx.db.patch(interactionId, {
      status: "resolved",
    });

    return { success: true };
  },
});

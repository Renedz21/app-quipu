import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { suggestRescueTransfer } from "./lib/budgetMath";

const FREEZE_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

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
      // v2.5: do NOT apply the transfer automatically. Return the suggestion
      // and let the UI prompt the user for confirmation. The mutation marks
      // the interaction as "resolved" with the suggestion in the nudge; the
      // actual transfer is applied via a separate mutation after confirmation.
      const [savings, wants] = await Promise.all([
        ctx.db
          .query("envelopes")
          .withIndex("by_cycle_type", (q) =>
            q.eq("cycleId", interaction.cycleId).eq("type", "savings"),
          )
          .unique(),
        ctx.db
          .query("envelopes")
          .withIndex("by_cycle_type", (q) =>
            q.eq("cycleId", interaction.cycleId).eq("type", "wants"),
          )
          .unique(),
      ]);

      if (savings && wants) {
        const suggestion = suggestRescueTransfer(
          savings.remainingAmount,
          wants.remainingAmount,
        );
        await ctx.db.patch(interactionId, {
          selectedOptionId: optionId,
          status: "resolved",
          initialNudge: `Te sugiero transferir ${suggestion.transfer} céntimos de Savings a Gustos para cubrir tu déficit proyectado de ${suggestion.projectedDeficit} céntimos. Confirma en la UI para aplicar.`,
        });
      } else {
        await ctx.db.patch(interactionId, {
          selectedOptionId: optionId,
          status: "resolved",
        });
      }
      return { success: true, mode: "suggested" as const };
    }

    if (optionId === "freeze_wants") {
      const wants = await ctx.db
        .query("envelopes")
        .withIndex("by_cycle_type", (q) =>
          q.eq("cycleId", interaction.cycleId).eq("type", "wants"),
        )
        .unique();
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

import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { isValidAllocations, isValidPaydays } from "./lib/budgetMath";
/**
 * Obtiene el perfil del usuario autenticado actual.
 * Retorna null si el usuario no ha completado el onboarding.
 */
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Buscamos el perfil usando el userId string que Better Auth provee
    return await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();
  },
});

/**
 * Crea el perfil financiero del usuario al terminar el Onboarding.
 * Es una mutación atómica: siembra perfil, racha y fondo de emergencia.
 */
export const createProfile = mutation({
  args: {
    name: v.optional(v.string()),
    country: v.string(),
    currencyCode: v.string(),
    currencySymbol: v.string(),
    incomeModel: v.union(
      v.literal("fixed"),
      v.literal("variable"),
      v.literal("mixed"),
    ),
    payFrequency: v.optional(
      v.union(
        v.literal("monthly"),
        v.literal("biweekly"),
        v.literal("weekly"),
        v.literal("variable"),
      ),
    ),
    paydays: v.optional(v.array(v.number())),
    cycleDurationDays: v.optional(v.number()),
    mixedFixedAmount: v.optional(v.number()),
    allocationNeeds: v.number(),
    allocationWants: v.number(),
    allocationSavings: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión con tu Passkey o credencial.",
      });
    }

    // Idempotencia primero: si ya existe, no revalidamos ni re-sembramos.
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();
    if (existing) return existing._id;

    const name = (args.name ?? identity.name ?? "").trim();
    if (!name) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "El nombre es obligatorio.",
        data: { field: "name" },
      });
    }

    if (
      (args.incomeModel === "fixed" || args.incomeModel === "mixed") &&
      (!args.payFrequency || !args.paydays || args.paydays.length === 0)
    ) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message:
          "Para ingresos fijos o mixtos, payFrequency y paydays son obligatorios.",
        data: { field: "payFrequency" },
      });
    }
    if (args.incomeModel === "variable" && args.payFrequency) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Para ingresos variables, payFrequency no aplica.",
        data: { field: "payFrequency" },
      });
    }

    if (
      !isValidAllocations(
        args.allocationNeeds,
        args.allocationWants,
        args.allocationSavings,
      )
    ) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message:
          "La distribución de sobres (Necesidades, Gustos, Ahorro) debe sumar exactamente 100% con valores enteros no negativos.",
        data: { field: "allocations" },
      });
    }
    if (args.payFrequency && args.paydays) {
      if (!isValidPaydays(args.payFrequency, args.paydays)) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message:
            "Los días de pago no son válidos para la frecuencia seleccionada.",
          data: { field: "paydays" },
        });
      }
    }

    const profileId = await ctx.db.insert("profiles", {
      userId: identity.subject,
      name,
      country: args.country,
      currencyCode: args.currencyCode,
      currencySymbol: args.currencySymbol,
      incomeModel: args.incomeModel,
      payFrequency: args.payFrequency,
      paydays: args.paydays,
      cycleDurationDays: args.cycleDurationDays,
      mixedFixedAmount: args.mixedFixedAmount,
      allocationNeeds: args.allocationNeeds,
      allocationWants: args.allocationWants,
      allocationSavings: args.allocationSavings,
      onboardingComplete: true,
      plan: "free",
      createdAt: Date.now(),
    });

    // Fondo de Emergencia por defecto: evita el dashboard en blanco tras el onboarding.
    await ctx.db.insert("subEnvelopes", {
      profileId,
      parentEnvelopeType: "savings",
      label: "Fondo de Emergencia",
      emoji: "🛡️",
      currentAmount: 0,
      isSystemDefault: true,
    });

    await ctx.db.insert("streaks", {
      profileId,
      currentStreak: 0,
      longestStreak: 0,
    });

    return profileId;
  },
});

/**
 * Actualiza los porcentajes de pre-compromiso o la configuración de pagos.
 */
export const updateProfileSettings = mutation({
  args: {
    allocationNeeds: v.optional(v.number()),
    allocationWants: v.optional(v.number()),
    allocationSavings: v.optional(v.number()),
    payFrequency: v.optional(
      v.union(
        v.literal("monthly"),
        v.literal("biweekly"),
        v.literal("weekly"),
        v.literal("variable"),
      ),
    ),
    paydays: v.optional(v.array(v.number())),
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

    const needs = args.allocationNeeds ?? profile.allocationNeeds;
    const wants = args.allocationWants ?? profile.allocationWants;
    const savings = args.allocationSavings ?? profile.allocationSavings;
    if (!isValidAllocations(needs, wants, savings)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message:
          "Los porcentajes deben sumar exactamente 100% con valores enteros no negativos.",
      });
    }

    const payFrequency = args.payFrequency ?? profile.payFrequency ?? "monthly";
    const paydays = args.paydays ?? profile.paydays ?? [];
    if (!isValidPaydays(payFrequency, paydays)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message:
          "Los días de pago no son válidos para la frecuencia seleccionada.",
        data: { field: "paydays" },
      });
    }

    // Convex interpreta `undefined` como "borrar campo": solo incluimos los definidos.
    const updates: Partial<
      Pick<
        Doc<"profiles">,
        | "allocationNeeds"
        | "allocationWants"
        | "allocationSavings"
        | "payFrequency"
        | "paydays"
      >
    > = {};
    if (args.allocationNeeds !== undefined)
      updates.allocationNeeds = args.allocationNeeds;
    if (args.allocationWants !== undefined)
      updates.allocationWants = args.allocationWants;
    if (args.allocationSavings !== undefined)
      updates.allocationSavings = args.allocationSavings;
    if (args.payFrequency !== undefined)
      updates.payFrequency = args.payFrequency;
    if (args.paydays !== undefined) updates.paydays = args.paydays;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(profile._id, updates);
    }

    return { success: true };
  },
});

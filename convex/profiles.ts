import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
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

export const getMyInternalProfile = internalQuery({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");
    return {
      userId: identity.subject,
      email: identity.email ?? "",
    };
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
    variableIncomeSources: v.optional(v.array(v.string())),
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
      variableIncomeSources: args.variableIncomeSources,
      allocationNeeds: args.allocationNeeds,
      allocationWants: args.allocationWants,
      allocationSavings: args.allocationSavings,
      onboardingComplete: true,
      plan: "free",
      appearanceTheme: "light",
      accentPreset: "moss",
      appIconVariant: "light",
      dailySummaryEnabled: true,
      cycleAlertsEnabled: true,
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
    name: v.optional(v.string()),
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

    if (args.name !== undefined) {
      const trimmed = args.name.trim();
      if (trimmed.length < 1 || trimmed.length > 80) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "El nombre debe tener entre 1 y 80 caracteres.",
          data: { field: "name" },
        });
      }
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
        | "name"
      >
    > = {};
    if (args.name !== undefined) updates.name = args.name.trim();
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

/**
 * D3 — Exportación de datos personales (Ley 29733, derecho de portabilidad).
 * Reúne todos los hechos del dominio del usuario autenticado en un solo
 * documento JSON descargable desde Ajustes.
 */
export const exportMyData = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión.",
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
    const profileId = profile._id;

    const financialCycles = await ctx.db
      .query("financialCycles")
      .withIndex("by_profile_status", (q) => q.eq("profileId", profileId))
      .collect();

    // surplusContributions solo tiene índice por ciclo.
    const surplusContributions = (
      await Promise.all(
        financialCycles.map((cycle) =>
          ctx.db
            .query("surplusContributions")
            .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
            .collect(),
        ),
      )
    ).flat();

    const [
      envelopes,
      subEnvelopes,
      fixedCommitments,
      expenses,
      incomeEvents,
      coachInteractions,
      streaks,
      cycleHistory,
    ] = await Promise.all([
      ctx.db
        .query("envelopes")
        .withIndex("by_profile_type", (q) => q.eq("profileId", profileId))
        .collect(),
      ctx.db
        .query("subEnvelopes")
        .withIndex("by_profile", (q) => q.eq("profileId", profileId))
        .collect(),
      ctx.db
        .query("fixedCommitments")
        .withIndex("by_profileId", (q) => q.eq("profileId", profileId))
        .collect(),
      ctx.db
        .query("expenses")
        .withIndex("by_profile_time", (q) => q.eq("profileId", profileId))
        .collect(),
      ctx.db
        .query("incomeEvents")
        .withIndex("by_profile_time", (q) => q.eq("profileId", profileId))
        .collect(),
      ctx.db
        .query("coachInteractions")
        .withIndex("by_profile_status", (q) => q.eq("profileId", profileId))
        .collect(),
      ctx.db
        .query("streaks")
        .withIndex("by_profileId", (q) => q.eq("profileId", profileId))
        .collect(),
      ctx.db
        .query("cycleHistory")
        .withIndex("by_profileId", (q) => q.eq("profileId", profileId))
        .collect(),
    ]);

    return {
      exportedAt: Date.now(),
      profile,
      financialCycles,
      envelopes,
      subEnvelopes,
      fixedCommitments,
      expenses,
      incomeEvents,
      surplusContributions,
      coachInteractions,
      streaks,
      cycleHistory,
    };
  },
});

/**
 * D3 — Borrado en cascada de todos los datos financieros del perfil.
 * Lo llama el trigger `onDelete` de Better Auth (convex/auth.ts) cuando el
 * usuario elimina su cuenta. Las tablas de Better Auth (user, session,
 * account, passkey) las borra el propio plugin.
 */
export const deleteAllDataForProfile = internalMutation({
  args: { profileId: v.id("profiles") },
  returns: v.null(),
  handler: async (ctx, { profileId }) => {
    const cycles = await ctx.db
      .query("financialCycles")
      .withIndex("by_profile_status", (q) => q.eq("profileId", profileId))
      .collect();

    const deleteDocs = async (
      docs: ReadonlyArray<{ _id: Parameters<typeof ctx.db.delete>[0] }>,
    ) => {
      await Promise.all(docs.map((doc) => ctx.db.delete(doc._id)));
    };

    // Tablas indexadas solo por ciclo (ledger post-2026-07-31).
    const docsByCycle = await Promise.all(
      cycles.map(async (cycle) => {
        const [contributions, allocationLines, transfers, reservations] =
          await Promise.all([
            ctx.db
              .query("surplusContributions")
              .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
              .collect(),
            ctx.db
              .query("incomeAllocationLines")
              .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
              .collect(),
            ctx.db
              .query("internalTransfers")
              .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
              .collect(),
            ctx.db
              .query("commitmentReservations")
              .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
              .collect(),
          ]);
        return [
          ...contributions,
          ...allocationLines,
          ...transfers,
          ...reservations,
        ];
      }),
    );
    await deleteDocs(docsByCycle.flat());
    await Promise.all(cycles.map((cycle) => ctx.db.delete(cycle._id)));

    await deleteDocs(
      await ctx.db
        .query("envelopes")
        .withIndex("by_profile_type", (q) => q.eq("profileId", profileId))
        .collect(),
    );
    await deleteDocs(
      await ctx.db
        .query("subEnvelopes")
        .withIndex("by_profile", (q) => q.eq("profileId", profileId))
        .collect(),
    );
    await deleteDocs(
      await ctx.db
        .query("fixedCommitments")
        .withIndex("by_profileId", (q) => q.eq("profileId", profileId))
        .collect(),
    );
    await deleteDocs(
      await ctx.db
        .query("expenses")
        .withIndex("by_profile_time", (q) => q.eq("profileId", profileId))
        .collect(),
    );
    await deleteDocs(
      await ctx.db
        .query("incomeEvents")
        .withIndex("by_profile_time", (q) => q.eq("profileId", profileId))
        .collect(),
    );
    await deleteDocs(
      await ctx.db
        .query("coachInteractions")
        .withIndex("by_profile_status", (q) => q.eq("profileId", profileId))
        .collect(),
    );
    await deleteDocs(
      await ctx.db
        .query("streaks")
        .withIndex("by_profileId", (q) => q.eq("profileId", profileId))
        .collect(),
    );
    await deleteDocs(
      await ctx.db
        .query("cycleHistory")
        .withIndex("by_profileId", (q) => q.eq("profileId", profileId))
        .collect(),
    );
    await deleteDocs(
      await ctx.db
        .query("accountReviewFlags")
        .withIndex("by_profileId", (q) => q.eq("profileId", profileId))
        .collect(),
    );

    await ctx.db.delete(profileId);
    return null;
  },
});

import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { isValidAllocations } from "./lib/budgetMath";
import {
  buildCycleScheduleCopy,
  formatActiveCycleRangeCopy,
  incomeModelLabel,
  planDisplay,
  resolveCycleAlertsEnabled,
  resolveDailySummaryEnabled,
} from "./lib/settingsCopy";

type PasskeyRecord = {
  id: string;
  name: string | null;
  deviceType: string;
  backedUp: boolean;
  createdAt: number | null;
};

async function loadPasskeysForUser(
  ctx: QueryCtx,
  userId: string,
): Promise<{
  passkeys: PasskeyRecord[];
  passkeysSource: "better_auth" | "unavailable";
}> {
  try {
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "passkey",
      where: [{ field: "userId", operator: "eq", value: userId }],
      paginationOpts: { numItems: 50, cursor: null },
    });

    const page = (result as { page?: unknown[] }).page ?? [];
    const passkeys = page
      .map((row) => {
        const doc = row as {
          _id?: string;
          id?: string;
          name?: string | null;
          deviceType?: string;
          backedUp?: boolean;
          createdAt?: number | null;
        };
        const id = doc._id ?? doc.id;
        if (!id) return null;
        return {
          id: String(id),
          name: doc.name ?? null,
          deviceType: doc.deviceType ?? "unknown",
          backedUp: doc.backedUp ?? false,
          createdAt: doc.createdAt ?? null,
        };
      })
      .filter((row): row is PasskeyRecord => row !== null);

    return { passkeys, passkeysSource: "better_auth" };
  } catch {
    return { passkeys: [], passkeysSource: "unavailable" };
  }
}

export const getSettingsOverview = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!profile) return null;

    const [commitments, activeCycle, security] = await Promise.all([
      ctx.db
        .query("fixedCommitments")
        .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
        .collect(),
      ctx.db
        .query("financialCycles")
        .withIndex("by_profile_status", (q) =>
          q.eq("profileId", profile._id).eq("status", "active"),
        )
        .unique(),
      loadPasskeysForUser(ctx, identity.subject),
    ]);

    const cycleSchedule = buildCycleScheduleCopy(profile);
    const tags: string[] = [];
    if (profile.variableIncomeSources?.length) {
      tags.push(...profile.variableIncomeSources.slice(0, 2));
    }
    tags.push(`Perfil ${incomeModelLabel(profile.incomeModel)}`);

    const totalCents = commitments.reduce((sum, c) => sum + c.amount, 0);

    return {
      account: {
        name: profile.name,
        email: identity.email ?? null,
        country: profile.country,
        currencyCode: profile.currencyCode,
        currencySymbol: profile.currencySymbol,
        incomeModel: {
          value: profile.incomeModel,
          label: incomeModelLabel(profile.incomeModel),
        },
        tags,
        plan: planDisplay(profile.plan),
      },
      allocations: {
        needs: profile.allocationNeeds,
        wants: profile.allocationWants,
        savings: profile.allocationSavings,
      },
      cycle: {
        ...cycleSchedule,
        activeRangeCopy: activeCycle
          ? formatActiveCycleRangeCopy(
              activeCycle.startDate,
              activeCycle.endDate,
            )
          : null,
      },
      commitments: {
        items: commitments.map((c) => ({
          id: c._id,
          name: c.name,
          amount: c.amount,
          envelope: c.envelope,
          dueDay: c.dueDay,
        })),
        totalCents,
      },
      preferences: {
        dailySummaryEnabled: resolveDailySummaryEnabled(profile),
        cycleAlertsEnabled: resolveCycleAlertsEnabled(profile),
        currencyReadOnly: `Sol peruano · ${profile.currencySymbol}`,
        localeReadOnly: "Español",
      },
      security,
    };
  },
});

export const listMyPasskeys = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return loadPasskeysForUser(ctx, identity.subject);
  },
});

export const updateAllocations = mutation({
  args: {
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
          "Los porcentajes deben sumar exactamente 100% con valores enteros no negativos.",
      });
    }

    await ctx.db.patch(profile._id, {
      allocationNeeds: args.allocationNeeds,
      allocationWants: args.allocationWants,
      allocationSavings: args.allocationSavings,
    });

    return { success: true };
  },
});

export const updateNotificationPreferences = mutation({
  args: {
    dailySummaryEnabled: v.optional(v.boolean()),
    cycleAlertsEnabled: v.optional(v.boolean()),
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

    if (
      args.dailySummaryEnabled === undefined &&
      args.cycleAlertsEnabled === undefined
    ) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Indica al menos una preferencia para actualizar.",
      });
    }

    const updates: {
      dailySummaryEnabled?: boolean;
      cycleAlertsEnabled?: boolean;
    } = {};
    if (args.dailySummaryEnabled !== undefined) {
      updates.dailySummaryEnabled = args.dailySummaryEnabled;
    }
    if (args.cycleAlertsEnabled !== undefined) {
      updates.cycleAlertsEnabled = args.cycleAlertsEnabled;
    }

    await ctx.db.patch(profile._id, updates);

    return { success: true };
  },
});

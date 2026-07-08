import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import { computeAllocations, CYCLE_DAYS } from "./lib/budgetMath";
import { resolveCycleForEvent } from "./lib/incomeEventLogic";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const HORIZON_DAYS = 15; // v2.5 initial: fixed at 15 for variable income model.

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
    const description = args.description.trim();
    if (!description) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "La descripción es obligatoria.",
        data: { field: "description" },
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
        await ctx.db.patch(activeCycle._id, { status: "closed" });
      }
      // Compute the new cycle's window.
      let cycleDays: number;
      if (profile.incomeModel === "variable") {
        cycleDays = HORIZON_DAYS;
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
    }

    // Compute distribution with the profile's current allocations.
    const distribution = computeAllocations(args.amount, {
      allocationNeeds: profile.allocationNeeds,
      allocationWants: profile.allocationWants,
      allocationSavings: profile.allocationSavings,
    });

    // Insert the event.
    const eventId = await ctx.db.insert("incomeEvents", {
      profileId: profile._id,
      cycleId,
      amount: args.amount,
      source: args.source,
      description,
      occurredAt: args.occurredAt,
      distributionApplied: distribution,
    });

    // Update or seed envelopes.
    const envelopes = await ctx.db
      .query("envelopes")
      .withIndex("by_cycle_type", (q) => q.eq("cycleId", cycleId))
      .collect();

    if (envelopes.length === 0) {
      // New cycle: seed the 3 envelopes with the distribution.
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
      // Existing cycle: patch envelopes with the distribution.
      await Promise.all(
        envelopes.map((env) =>
          ctx.db.patch(env._id, {
            allocatedAmount: env.allocatedAmount + distribution[env.type],
            remainingAmount: env.remainingAmount + distribution[env.type],
          }),
        ),
      );
    }

    // Update the cycle's snapshot.
    const cycle = await ctx.db.get(cycleId);
    if (!cycle) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Ciclo no encontrado tras insert.",
      });
    }
    await ctx.db.patch(cycle._id, {
      totalIncomeReceived: (cycle.totalIncomeReceived ?? 0) + args.amount,
    });

    return { eventId, cycleId, isNewCycle };
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
    if (!cycle || cycle.status !== "active") {
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

    // Reverse the cycle's total.
    await ctx.db.patch(cycle._id, {
      totalIncomeReceived: (cycle.totalIncomeReceived ?? 0) - event.amount,
    });

    await ctx.db.delete(args.eventId);
    return { success: true };
  },
});

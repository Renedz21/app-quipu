import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { mergeRecentMovements } from "./lib/dashboardMath";

const MOVEMENTS_LIST_LIMIT = 500;

function envelopeLabel(type: "needs" | "wants" | "savings"): string {
  switch (type) {
    case "needs":
      return "Necesidades";
    case "wants":
      return "Gustos";
    case "savings":
      return "Ahorro";
  }
}

export const listForActiveCycle = query({
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

    if (!activeCycle) {
      return {
        currencyCode: profile.currencyCode,
        cycle: null,
        movements: [] as Array<{
          id: string;
          kind: "expense" | "income";
          label: string;
          envelopeLabel?: string;
          amount: number;
          timestamp: number;
        }>,
      };
    }

    const envelopesRaw = await ctx.db
      .query("envelopes")
      .withIndex("by_cycle_type", (q) => q.eq("cycleId", activeCycle._id))
      .collect();

    const envelopeTypeById = new Map<Id<"envelopes">, Doc<"envelopes">["type"]>(
      envelopesRaw.map((envelope) => [envelope._id, envelope.type]),
    );

    const [expensesRaw, incomesRaw] = await Promise.all([
      ctx.db
        .query("expenses")
        .withIndex("by_cycle_envelope_time", (q) =>
          q.eq("cycleId", activeCycle._id),
        )
        .order("desc")
        .collect(),
      ctx.db
        .query("incomeEvents")
        .withIndex("by_cycle", (q) => q.eq("cycleId", activeCycle._id))
        .collect(),
    ]);

    const movements = mergeRecentMovements(
      expensesRaw.map((expense) => ({
        id: expense._id,
        description: expense.description,
        amount: expense.amount,
        timestamp: expense.timestamp,
        envelopeType: envelopeTypeById.get(expense.envelopeId),
      })),
      incomesRaw
        .sort((a, b) => b.occurredAt - a.occurredAt)
        .map((income) => ({
          id: income._id,
          description: income.description,
          amount: income.amount,
          occurredAt: income.occurredAt,
          incomeKind: income.incomeKind,
        })),
      MOVEMENTS_LIST_LIMIT,
    ).map((movement) => ({
      ...movement,
      envelopeLabel: movement.envelopeLabel
        ? envelopeLabel(movement.envelopeLabel as "needs" | "wants" | "savings")
        : undefined,
    }));

    return {
      currencyCode: profile.currencyCode,
      cycle: {
        startDate: activeCycle.startDate,
        endDate: activeCycle.endDate,
      },
      movements,
    };
  },
});

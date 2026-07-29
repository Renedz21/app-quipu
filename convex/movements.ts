import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";

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
        movements: [] as ReturnType<typeof buildMovements>,
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

    const movements = buildMovements(
      expensesRaw,
      incomesRaw,
      envelopeTypeById,
      MOVEMENTS_LIST_LIMIT,
    );

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

function buildMovements(
  expenses: Doc<"expenses">[],
  incomes: Doc<"incomeEvents">[],
  envelopeTypeById: Map<Id<"envelopes">, Doc<"envelopes">["type"]>,
  limit: number,
) {
  type ExpenseRow = {
    id: string;
    kind: "expense";
    label: string;
    envelopeLabel?: string;
    amount: number;
    timestamp: number;
    isExtraordinaryIncome?: false;
    envelopeType?: "needs" | "wants";
  };

  type IncomeRow = {
    id: string;
    kind: "income";
    label: string;
    amount: number;
    timestamp: number;
    isExtraordinaryIncome?: boolean;
    appliedByAutoRule?: boolean;
    occurredAt: number;
    source: Doc<"incomeEvents">["source"];
    incomeKind?: "habitual" | "extraordinary";
    extraordinaryType?: Doc<"incomeEvents">["extraordinaryType"];
    extraordinaryLabel?: string;
    distributionPolicy?: Doc<"incomeEvents">["distributionPolicy"];
  };

  const expenseRows: ExpenseRow[] = expenses.map((expense) => {
    const type = envelopeTypeById.get(expense.envelopeId);
    return {
      id: expense._id,
      kind: "expense",
      label: expense.description,
      envelopeLabel: type ? envelopeLabel(type) : undefined,
      amount: expense.amount,
      timestamp: expense.timestamp,
      envelopeType: type === "needs" || type === "wants" ? type : undefined,
    };
  });

  const incomeRows: IncomeRow[] = incomes.map((income) => ({
    id: income._id,
    kind: "income",
    label: income.description,
    amount: income.amount,
    timestamp: income.occurredAt,
    isExtraordinaryIncome: income.incomeKind === "extraordinary",
    appliedByAutoRule: income.appliedByAutoRule,
    occurredAt: income.occurredAt,
    source: income.source,
    incomeKind: income.incomeKind,
    extraordinaryType: income.extraordinaryType,
    extraordinaryLabel: income.extraordinaryLabel,
    distributionPolicy: income.distributionPolicy,
  }));

  return [...expenseRows, ...incomeRows]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

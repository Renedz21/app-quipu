import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import {
  buildTranquilCoachMessage,
  buildValidationCopy,
  computeCommitmentCoverageMvp,
  computeCycleDayMetrics,
  computeDailyAvailable,
  computeDisplayDailyCents,
  computeEnvelopePercentRemaining,
  computeSurplusProjection,
  daysUntilDueDay,
  evaluateCycleCompliance,
  mapComplianceToBadge,
  mergeRecentMovements,
  sortCommitmentsByDue,
} from "./lib/dashboardMath";

const ENVELOPE_ORDER = ["needs", "wants", "savings"] as const;

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

export const getSummary = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!profile) return null;

    const commitmentsRaw = await ctx.db
      .query("fixedCommitments")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .collect();

    const activeCycle = await ctx.db
      .query("financialCycles")
      .withIndex("by_profile_status", (q) =>
        q.eq("profileId", profile._id).eq("status", "active"),
      )
      .unique();

    const now = Date.now();

    if (!activeCycle) {
      const emptyCommitments = sortCommitmentsByDue(
        commitmentsRaw.map((commitment) => ({
          id: commitment._id,
          name: commitment.name,
          amount: commitment.amount,
          envelope: commitment.envelope,
          dueDay: commitment.dueDay,
          daysUntilDue: daysUntilDueDay(commitment.dueDay, now),
          coverageStatus: "uncovered" as const,
        })),
      );

      return {
        profile: {
          name: profile.name,
          currencyCode: profile.currencyCode,
          plan: profile.plan,
        },
        cycle: null,
        hero: null,
        envelopes: [],
        commitments: emptyCommitments,
        coach: null,
        movements: [],
      };
    }

    const envelopesRaw = await ctx.db
      .query("envelopes")
      .withIndex("by_cycle_type", (q) => q.eq("cycleId", activeCycle._id))
      .collect();

    const envelopeByType = new Map<
      "needs" | "wants" | "savings",
      Doc<"envelopes">
    >();
    for (const envelope of envelopesRaw) {
      envelopeByType.set(envelope.type, envelope);
    }

    const cycleMetrics = computeCycleDayMetrics(
      activeCycle.startDate,
      activeCycle.endDate,
      now,
    );

    const compliance = evaluateCycleCompliance(envelopesRaw);
    const statusBadge = mapComplianceToBadge(compliance);
    const wantsEnvelope = envelopeByType.get("wants");
    const dailyAvailableCents = computeDailyAvailable(
      wantsEnvelope?.remainingAmount ?? 0,
      cycleMetrics.daysRemaining,
    );

    const hero = {
      dailyAvailableCents,
      displayDailyCents: computeDisplayDailyCents(dailyAvailableCents),
      validationCopy: buildValidationCopy(statusBadge),
      statusBadge,
    };

    const envelopes = ENVELOPE_ORDER.map((type) => {
      const envelope = envelopeByType.get(type);
      const remainingAmount = envelope?.remainingAmount ?? 0;
      const allocatedAmount = envelope?.allocatedAmount ?? 0;
      return {
        type,
        remainingAmount,
        allocatedAmount,
        percentRemaining: computeEnvelopePercentRemaining(
          remainingAmount,
          allocatedAmount,
        ),
      };
    });

    const commitments = sortCommitmentsByDue(
      commitmentsRaw.map((commitment) => {
        const envelopeRemaining =
          envelopeByType.get(commitment.envelope)?.remainingAmount ?? 0;
        return {
          id: commitment._id,
          name: commitment.name,
          amount: commitment.amount,
          envelope: commitment.envelope,
          dueDay: commitment.dueDay,
          daysUntilDue: daysUntilDueDay(commitment.dueDay, now),
          coverageStatus: computeCommitmentCoverageMvp(
            commitment.amount,
            envelopeRemaining,
          ),
        };
      }),
    );

    const pendingCoach = await ctx.db
      .query("coachInteractions")
      .withIndex("by_profile_status", (q) =>
        q.eq("profileId", profile._id).eq("status", "pending"),
      )
      .order("desc")
      .first();

    let coach: {
      kind: "tranquil" | "crisis" | "suggestion";
      message: string;
      interactionId?: Id<"coachInteractions">;
      options?: Array<{ id: string; label: string }>;
    } | null = null;

    if (pendingCoach) {
      coach = {
        kind:
          pendingCoach.triggerEvent === "WANTS_OVERFLOW_60"
            ? "crisis"
            : "suggestion",
        message: pendingCoach.initialNudge,
        interactionId: pendingCoach._id,
        options: pendingCoach.options,
      };
    } else {
      const surplusCents = computeSurplusProjection(envelopes);
      coach = {
        kind: "tranquil",
        message: buildTranquilCoachMessage(
          profile.name,
          surplusCents,
          profile.currencySymbol,
        ),
      };
    }

    const [expensesRaw, incomesForCycle] = await Promise.all([
      ctx.db
        .query("expenses")
        .withIndex("by_cycle_envelope_time", (q) =>
          q.eq("cycleId", activeCycle._id),
        )
        .order("desc")
        .take(8),
      ctx.db
        .query("incomeEvents")
        .withIndex("by_cycle", (q) => q.eq("cycleId", activeCycle._id))
        .collect(),
    ]);

    const incomesRaw = incomesForCycle
      .sort((a, b) => b.occurredAt - a.occurredAt)
      .slice(0, 8);

    const envelopeTypeById = new Map(
      envelopesRaw.map((envelope) => [envelope._id, envelope.type]),
    );

    const movements = mergeRecentMovements(
      expensesRaw.map((expense) => ({
        id: expense._id,
        description: expense.description,
        amount: expense.amount,
        timestamp: expense.timestamp,
        envelopeType: envelopeTypeById.get(expense.envelopeId),
      })),
      incomesRaw.map((income) => ({
        id: income._id,
        description: income.description,
        amount: income.amount,
        occurredAt: income.occurredAt,
      })),
      4,
    ).map((movement) => ({
      ...movement,
      envelopeLabel: movement.envelopeLabel
        ? envelopeLabel(movement.envelopeLabel as "needs" | "wants" | "savings")
        : undefined,
    }));

    return {
      profile: {
        name: profile.name,
        currencyCode: profile.currencyCode,
        plan: profile.plan,
      },
      cycle: {
        id: activeCycle._id,
        startDate: activeCycle.startDate,
        endDate: activeCycle.endDate,
        ...cycleMetrics,
      },
      hero,
      envelopes,
      commitments,
      coach,
      movements,
    };
  },
});

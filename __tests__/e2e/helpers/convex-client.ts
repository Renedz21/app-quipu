import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { requireEnv } from "./env";

export function createAuthenticatedConvexClient(token: string) {
  const client = new ConvexHttpClient(requireEnv("NEXT_PUBLIC_CONVEX_URL"));
  client.setAuth(token);
  return client;
}

export async function seedOnboardedUser(
  client: ConvexHttpClient,
  options?: { plan?: "free" | "premium" },
) {
  await client.mutation(api.profiles.createProfile, {
    country: "PE",
    currencyCode: "PEN",
    currencySymbol: "S/",
    incomeModel: "fixed",
    payFrequency: "monthly",
    paydays: [1],
    allocationNeeds: 50,
    allocationWants: 30,
    allocationSavings: 20,
  });
  if (options?.plan && options.plan !== "free") {
    // Solo funciona en deployments dev (guard en convex/testing.ts).
    await client.mutation(api.testing.setMyPlan, { plan: options.plan });
  }
}

export async function seedActiveCycle(
  client: ConvexHttpClient,
  amount = 100_000,
) {
  return client.mutation(api.incomeEvents.createIncomeEvent, {
    amount,
    source: "payroll",
    description: "Smoke test income",
    occurredAt: Date.now(),
  });
}

export async function registerWantsExpense(
  client: ConvexHttpClient,
  amount: number,
  description: string,
) {
  return client.mutation(api.expenses.registerExpense, {
    amount,
    description,
    envelopeType: "wants",
  });
}

export async function resolveCoachInteraction(
  client: ConvexHttpClient,
  interactionId: Id<"coachInteractions">,
  optionId: "freeze_wants" | "suggest_rescue" | "ignore",
) {
  return client.mutation(api.coachEngine.resolveNudgeAction, {
    interactionId,
    optionId,
  });
}

export async function applyRescueTransfer(
  client: ConvexHttpClient,
  interactionId: Id<"coachInteractions">,
) {
  return client.mutation(api.coachEngine.applyRescueTransfer, {
    interactionId,
  });
}

export async function dismissRescueSuggestion(
  client: ConvexHttpClient,
  interactionId: Id<"coachInteractions">,
) {
  return client.mutation(api.coachEngine.dismissRescueSuggestion, {
    interactionId,
  });
}

export async function getEnvelopeBalances(client: ConvexHttpClient) {
  const summary = await client.query(api.dashboard.getSummary, {});
  if (!summary?.envelopes) return null;
  const byType = Object.fromEntries(
    summary.envelopes.map((envelope) => [
      envelope.type,
      envelope.remainingAmount,
    ]),
  );
  return {
    needs: byType.needs ?? 0,
    wants: byType.wants ?? 0,
    savings: byType.savings ?? 0,
  };
}

export async function triggerCoachNudge(client: ConvexHttpClient) {
  await seedActiveCycle(client, 100_000);
  await registerWantsExpense(client, 12_000, "Smoke burn 1");
  await registerWantsExpense(client, 10_000, "Smoke burn 2");
  return client.query(api.coachEngine.getActiveNudge, {});
}

export async function createFixedCommitment(
  client: ConvexHttpClient,
  params: {
    name: string;
    amount: number;
    envelope: "needs" | "wants";
    dueDay: number;
  },
) {
  return client.mutation(api.fixedCommitments.createFixedCommitment, params);
}

export async function getDashboardCoach(client: ConvexHttpClient) {
  const summary = await client.query(api.dashboard.getSummary, {});
  return summary?.coach ?? null;
}

export async function applyCoverFromCycleSavings(client: ConvexHttpClient) {
  return client.mutation(api.coachEngine.applyCoverFromCycleSavings, {});
}

export async function postponeCommitmentForCycle(
  client: ConvexHttpClient,
  commitmentId: Id<"fixedCommitments">,
) {
  return client.mutation(api.coachEngine.postponeCommitmentForCycle, {
    commitmentId,
  });
}

export async function snoozeCrisisCoach(client: ConvexHttpClient) {
  return client.mutation(api.coachEngine.snoozeCrisisCoach, {});
}

/** Overspend wants slightly to land in coach `warning` (not crisis). */
/** Needs overspend within buffer - coach warning (no wants overflow nudge). */
export async function seedWarningCoachState(client: ConvexHttpClient) {
  await seedActiveCycle(client, 100_000);
  await client.mutation(api.expenses.registerExpense, {
    amount: 51_000,
    description: "Smoke warning needs overspend",
    envelopeType: "needs",
  });
}

export async function seedCrisisFromUncoveredCommitment(
  client: ConvexHttpClient,
) {
  await createFixedCommitment(client, {
    name: "Alquiler smoke",
    amount: 80_000,
    envelope: "needs",
    dueDay: 15,
  });
  await seedActiveCycle(client, 100_000);
  await registerWantsExpense(client, 100, "Smoke exit early cycle");
}

/** Heavy wants overspend → coach `crisis` via failed compliance. */
export async function seedCrisisFromFailedCompliance(client: ConvexHttpClient) {
  await seedActiveCycle(client, 100_000);
  await client.mutation(api.expenses.registerExpense, {
    amount: 55_000,
    description: "Smoke crisis needs overspend",
    envelopeType: "needs",
  });
}

export async function seedTranquilCoachState(client: ConvexHttpClient) {
  await seedActiveCycle(client, 100_000);
  await registerWantsExpense(client, 5_000, "Smoke tranquil expense");
}

export async function createExtraordinaryIncome(
  client: ConvexHttpClient,
  params: {
    amount: number;
    extraordinaryType?:
      | "gratification_july"
      | "gratification_december"
      | "cts"
      | "corporate_bonus"
      | "profit_sharing"
      | "custom";
    distributionPolicy?: "profile_default" | "all_to_savings";
    extraordinaryLabel?: string;
  },
) {
  return client.mutation(api.incomeEvents.createIncomeEvent, {
    amount: params.amount,
    source: "payroll",
    description: "",
    occurredAt: Date.now(),
    incomeKind: "extraordinary",
    extraordinaryType: params.extraordinaryType ?? "gratification_july",
    distributionPolicy: params.distributionPolicy ?? "all_to_savings",
    ...(params.extraordinaryLabel
      ? { extraordinaryLabel: params.extraordinaryLabel }
      : {}),
  });
}

export async function getMoveSurplusContext(client: ConvexHttpClient) {
  return client.query(api.savings.getMoveSurplusContext, {});
}

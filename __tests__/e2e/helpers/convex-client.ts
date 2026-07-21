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
    plan: options?.plan,
  });
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
    summary.envelopes.map((envelope) => [envelope.type, envelope.remainingAmount]),
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

import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { requireEnv } from "./env";

export function createAuthenticatedConvexClient(token: string) {
  const client = new ConvexHttpClient(requireEnv("NEXT_PUBLIC_CONVEX_URL"));
  client.setAuth(token);
  return client;
}

export async function seedOnboardedUser(client: ConvexHttpClient) {
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

export async function triggerCoachNudge(client: ConvexHttpClient) {
  await seedActiveCycle(client, 100_000);
  await registerWantsExpense(client, 12_000, "Smoke burn 1");
  await registerWantsExpense(client, 10_000, "Smoke burn 2");
  return client.query(api.coachEngine.getActiveNudge, {});
}

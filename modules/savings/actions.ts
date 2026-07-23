"use client";

import { useMutation } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  type ContributeToGoalInput,
  contributeToGoalInputSchema,
  type MoveSurplusInput,
  moveSurplusInputSchema,
} from "./schemas";

export function useMoveSurplusToSavings() {
  return useMutation(api.savings.moveSurplusToSavings);
}

export function useContributeToGoal() {
  return useMutation(api.savings.contributeToGoal);
}

type MoveSurplusMutationArgs = FunctionArgs<
  typeof api.savings.moveSurplusToSavings
>;

export function parseMoveSurplusInput(
  raw: MoveSurplusInput,
): MoveSurplusMutationArgs {
  const parsed = moveSurplusInputSchema.parse(raw);
  return {
    fromEnvelope: parsed.fromEnvelope,
    amount: parsed.amount,
    ...(parsed.toSubEnvelopeId
      ? { toSubEnvelopeId: parsed.toSubEnvelopeId as Id<"subEnvelopes"> }
      : {}),
  };
}

export async function moveSurplusToSavings(
  mutate: ReturnType<typeof useMoveSurplusToSavings>,
  raw: MoveSurplusInput,
) {
  return mutate(parseMoveSurplusInput(raw));
}

type ContributeToGoalMutationArgs = FunctionArgs<
  typeof api.savings.contributeToGoal
>;

export function parseContributeToGoalInput(
  raw: ContributeToGoalInput,
): ContributeToGoalMutationArgs {
  const parsed = contributeToGoalInputSchema.parse(raw);
  return {
    goalId: parsed.goalId as Id<"subEnvelopes">,
    ...(parsed.amountCents !== undefined ? { amount: parsed.amountCents } : {}),
  };
}

export async function contributeToGoal(
  mutate: ReturnType<typeof useContributeToGoal>,
  raw: ContributeToGoalInput,
) {
  return mutate(parseContributeToGoalInput(raw));
}

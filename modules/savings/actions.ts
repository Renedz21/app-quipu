"use client";

import { useMutation } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { moveSurplusInputSchema, type MoveSurplusInput } from "./schemas";

export function useMoveSurplusToSavings() {
  return useMutation(api.savings.moveSurplusToSavings);
}

type MoveSurplusMutationArgs = FunctionArgs<
  typeof api.savings.moveSurplusToSavings
>;

export function parseMoveSurplusInput(raw: MoveSurplusInput): MoveSurplusMutationArgs {
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

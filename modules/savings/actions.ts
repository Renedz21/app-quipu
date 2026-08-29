"use client";

import { useMutation } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  type ContributeToSubEnvelopeInput,
  contributeToSubEnvelopeInputSchema,
  type MoveSurplusInput,
  moveSurplusInputSchema,
} from "./schemas";

export function useMoveSurplusToSavings() {
  return useMutation(api.savings.moveSurplusToSavings);
}

export function useContributeToSubEnvelope() {
  return useMutation(api.savings.contributeToSubEnvelope);
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

type ContributeToSubEnvelopeMutationArgs = FunctionArgs<
  typeof api.savings.contributeToSubEnvelope
>;

export function parseContributeToSubEnvelopeInput(
  raw: ContributeToSubEnvelopeInput,
): ContributeToSubEnvelopeMutationArgs {
  const parsed = contributeToSubEnvelopeInputSchema.parse(raw);
  return {
    subEnvelopeId: parsed.subEnvelopeId as Id<"subEnvelopes">,
    ...(parsed.amountCents !== undefined ? { amount: parsed.amountCents } : {}),
  };
}

export async function contributeToSubEnvelope(
  mutate: ReturnType<typeof useContributeToSubEnvelope>,
  raw: ContributeToSubEnvelopeInput,
) {
  return mutate(parseContributeToSubEnvelopeInput(raw));
}

"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function useResolveNudgeAction() {
  return useMutation(api.coachEngine.resolveNudgeAction);
}

export function useApplyRescueTransfer() {
  return useMutation(api.coachEngine.applyRescueTransfer);
}

export function useDismissRescueSuggestion() {
  return useMutation(api.coachEngine.dismissRescueSuggestion);
}

export function useApplyCoverFromCycleSavings() {
  return useMutation(api.coachEngine.applyCoverFromCycleSavings);
}

export function usePostponeCommitmentForCycle() {
  return useMutation(api.coachEngine.postponeCommitmentForCycle);
}

export function useSnoozeCrisisCoach() {
  return useMutation(api.coachEngine.snoozeCrisisCoach);
}

export type ResolveNudgeOptionId = "freeze_wants" | "suggest_rescue" | "ignore";

export async function resolveNudgeAction(
  mutate: ReturnType<typeof useResolveNudgeAction>,
  interactionId: Id<"coachInteractions">,
  optionId: ResolveNudgeOptionId,
) {
  return mutate({ interactionId, optionId });
}

export async function applyRescueTransfer(
  mutate: ReturnType<typeof useApplyRescueTransfer>,
  interactionId: Id<"coachInteractions">,
) {
  return mutate({ interactionId });
}

export async function dismissRescueSuggestion(
  mutate: ReturnType<typeof useDismissRescueSuggestion>,
  interactionId: Id<"coachInteractions">,
) {
  return mutate({ interactionId });
}

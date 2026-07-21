"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function useResolveNudgeAction() {
  return useMutation(api.coachEngine.resolveNudgeAction);
}

export type ResolveNudgeOptionId = "freeze_wants" | "suggest_rescue" | "ignore";

export async function resolveNudgeAction(
  mutate: ReturnType<typeof useResolveNudgeAction>,
  interactionId: Id<"coachInteractions">,
  optionId: ResolveNudgeOptionId,
) {
  return mutate({ interactionId, optionId });
}

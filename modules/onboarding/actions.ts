"use server";

import { fetchAuthMutation } from "@/auth/auth-server";
import { api } from "@/convex/_generated/api";
import { fromConvexError } from "@/core/errors";
import { ONBOARDING_DEFAULTS } from "./constants";
import { finalPayloadSchema } from "./schemas";

export async function completeOnboardingAction(input: unknown) {
  const parsed = finalPayloadSchema.parse({
    ...ONBOARDING_DEFAULTS,
    ...(input as object),
  });
  try {
    await fetchAuthMutation(api.profiles.createProfile, parsed);
  } catch (error) {
    throw fromConvexError(error);
  }
}

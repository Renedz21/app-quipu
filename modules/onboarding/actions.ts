"use server";

import { fetchAuthMutation } from "@/auth/auth-server";
import { api } from "@/convex/_generated/api";
import { fromConvexError } from "@/core/errors";
import { ONBOARDING_DEFAULTS } from "./constants";
import { finalPayloadSchema } from "./schemas";

export async function completeOnboardingAction(input: unknown) {
  const clean = Object.fromEntries(
    Object.entries(input as Record<string, unknown>).filter(
      ([, v]) => v != null,
    ),
  );
  const parsed = finalPayloadSchema.parse({
    ...ONBOARDING_DEFAULTS,
    ...clean,
  });
  try {
    await fetchAuthMutation(api.profiles.createProfile, parsed);
  } catch (error) {
    throw fromConvexError(error);
  }
}

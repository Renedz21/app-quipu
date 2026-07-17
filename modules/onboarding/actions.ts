"use server";

import { redirect } from "next/navigation";
import { fetchAuthMutation } from "@/auth/auth-server";
import { api } from "@/convex/_generated/api";
import { fromConvexError } from "@/core/errors";
import { finalPayloadSchema } from "./schemas";
import { ONBOARDING_DEFAULTS } from "./constants";

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

export async function redirectToDashboard() {
  redirect("/dashboard");
}

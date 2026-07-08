import { authClient } from "@/auth/auth-client";
import { mapBetterAuthError } from "./errorMap";
import type { AuthResult } from "./types";
import type { SignInEmailInput, SignUpEmailInput } from "./schemas";

export async function signInWithEmail(
  input: SignInEmailInput,
): Promise<AuthResult<unknown>> {
  const result = await authClient.signIn.email({
    email: input.email,
    password: input.password,
  });
  if (result.error) {
    return {
      data: null,
      error: mapBetterAuthError({
        code: result.error.code ?? "UNKNOWN",
        message: result.error.message,
      }),
    };
  }
  return { data: result.data, error: null };
}

export async function signUpWithEmail(
  input: SignUpEmailInput,
): Promise<AuthResult<unknown>> {
  const result = await authClient.signUp.email({
    email: input.email,
    password: input.password,
    name: input.name ?? input.email.split("@")[0]!,
  });
  if (result.error) {
    return {
      data: null,
      error: mapBetterAuthError({
        code: result.error.code ?? "UNKNOWN",
        message: result.error.message,
      }),
    };
  }
  return { data: result.data, error: null };
}

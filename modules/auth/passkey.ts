import { authClient } from "@/auth/auth-client";
import { mapBetterAuthError } from "./errorMap";
import type { AuthResult } from "./types";

/**
 * Wrappers tipados sobre authClient.passkey.
 *
 * DEV NOTE: Este archivo reemplaza `auth/passkey.ts` (viejo). El viejo se borra
 * en el commit 5 de este plan. Hasta entonces conviven ambos.
 *
 * El return type cambia: antes era `result` (cualquier shape) y el caller
 * discriminaba `result.error` con strings. Ahora es AuthResult<T> con
 * MappedAuthError tipado.
 */
export async function registerPasskey({
  name,
  context,
}: {
  name?: string;
  context?: string;
} = {}): Promise<AuthResult<unknown>> {
  const result = await authClient.passkey.addPasskey({ name, context });
  if (result.error) {
    return {
      data: null,
      error: mapBetterAuthError({
        code: "code" in result.error ? result.error.code : "UNKNOWN",
        message: result.error.message,
      }),
    };
  }
  return { data: result.data, error: null };
}

/**
 * Sign in con passkey.
 * - autoFill=true: Conditional UI (prompt nativo al pulsar sobre input con autocomplete="webauthn").
 * - autoFill=false: prompt explícito al pulsar el botón.
 */
export async function signInWithPasskey(
  autoFill = true,
): Promise<AuthResult<unknown>> {
  const result = await authClient.signIn.passkey({ autoFill });
  if (result.error) {
    return {
      data: null,
      error: mapBetterAuthError({
        code: "code" in result.error ? result.error.code : "UNKNOWN",
        message: result.error.message,
      }),
    };
  }
  return { data: result.data, error: null };
}

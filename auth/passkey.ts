import { authClient } from "./auth-client";

/**
 * Helpers for the passkey plugin, exposed as typed functions so you keep
 * full control over Better Auth on the client side.
 *
 * See https://www.better-auth.com/docs/plugins/passkey for the underlying
 * endpoints and options.
 */

/**
 * Registra una nueva passkey sin sesión previa. El servidor (resolveUser
 * en convex/auth.ts) crea el usuario a partir del `context` opaco.
 */
export async function registerPasskey({
  name,
  context,
}: {
  name?: string;
  context?: string;
}) {
  const result = await authClient.passkey.addPasskey({
    name,
    context,
  });
  return result;
}

/**
 * Inicia sesión con una passkey existente.
 * - `autoFill: true` → Conditional UI (prompt nativo del navegador al pulsar
 *   sobre un input con `autocomplete="... webauthn"`).
 * - `autoFill: false` → prompt explícito al pulsar el botón.
 */
export async function signInWithPasskey(autoFill = true) {
  const result = await authClient.signIn.passkey({
    autoFill,
  });
  return result;
}

export async function listPasskeys() {
  const result = await authClient.passkey.listUserPasskeys();
  return result;
}

export async function deletePasskey(id: string) {
  const result = await authClient.passkey.deletePasskey({ id });
  return result;
}

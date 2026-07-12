/**
 * Genera una contraseña interna que el usuario NUNCA ve ni escribe.
 * Se usa solo como relleno para satisfacer emailAndPassword.enabled,
 * mientras el método real de acceso es el passkey.
 *
 * Corre en el cliente (Client Component) porque signUp.email también
 * corre en el cliente. No es un secreto de aplicación: es aleatoriedad
 * de un solo uso, nunca se persiste en texto plano en ningún sitio
 * (Better Auth la hashea con scrypt antes de guardarla).
 */
export function generateInternalPassword(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/[+/=]/g, "")
    .slice(0, 32);
}

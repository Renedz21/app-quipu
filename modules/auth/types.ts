import type { ErrorCode } from "@/core/errors";

/**
 * Variantes del status card compartido.
 * Mapean 1:1 a ErrorCode de auth (no todos los ErrorCode son variantes).
 */
export type StatusVariant =
  | "success"
  | "error"
  | "verify-error"
  | "network-error"
  | "expired-error";

/**
 * Error mapeado de Better Auth a AppError-compatible shape.
 * El cliente usa esto para renderizar el StatusCard correcto.
 */
export interface MappedAuthError {
  code: ErrorCode;
  message: string;
  variant: StatusVariant;
}

/**
 * Resultado tipado de las operaciones de passkey/email.
 * Sustituye la API de Better Auth que retorna { data, error } con error: unknown.
 */
export type AuthResult<T> =
  | { data: T; error: null }
  | { data: null; error: MappedAuthError };

import type { ErrorCode } from "@/core/errors";
import { AUTH_MESSAGES } from "./constants";
import type { MappedAuthError, StatusVariant } from "./types";

/**
 * Input de Better Auth: puede ser un string (código) o un objeto { code, message }.
 * Mantenemos la flexibilidad porque el cliente de Better Auth retorna `error.code`
 * como string y `error.message` opcional.
 */
type BetterAuthErrorInput = string | { code: string; message?: string };

interface ErrorMapping {
  code: ErrorCode;
  variant: StatusVariant;
  message: string;
}

const TABLE: Record<string, ErrorMapping> = {
  SECURITY_ERROR: {
    code: "AUTH_PASSKEY_SECURITY_ERROR",
    variant: "verify-error",
    message: AUTH_MESSAGES.passkeyVerifyError,
  },
  security_error: {
    code: "AUTH_PASSKEY_SECURITY_ERROR",
    variant: "verify-error",
    message: AUTH_MESSAGES.passkeyVerifyError,
  },
  NETWORK_ERROR: {
    code: "AUTH_PASSKEY_NETWORK_ERROR",
    variant: "network-error",
    message: AUTH_MESSAGES.passkeyNetworkError,
  },
  network_error: {
    code: "AUTH_PASSKEY_NETWORK_ERROR",
    variant: "network-error",
    message: AUTH_MESSAGES.passkeyNetworkError,
  },
  INVALID_CHALLENGE: {
    code: "AUTH_PASSKEY_EXPIRED",
    variant: "expired-error",
    message: AUTH_MESSAGES.passkeyExpired,
  },
  USER_NOT_FOUND: {
    code: "AUTH_USER_NOT_FOUND",
    variant: "error",
    message: AUTH_MESSAGES.userNotFound,
  },
  INVALID_EMAIL: {
    code: "AUTH_INVALID_CREDENTIALS",
    variant: "error",
    message: AUTH_MESSAGES.invalidCredentials,
  },
  INVALID_PASSWORD: {
    code: "AUTH_INVALID_CREDENTIALS",
    variant: "error",
    message: AUTH_MESSAGES.invalidCredentials,
  },
  EMAIL_ALREADY_EXISTS: {
    code: "AUTH_EMAIL_TAKEN",
    variant: "error",
    message: AUTH_MESSAGES.emailTaken,
  },
};

const FALLBACK: ErrorMapping = {
  code: "AUTH_UNKNOWN_ERROR",
  variant: "error",
  message: AUTH_MESSAGES.unknown,
};

export function mapBetterAuthError(
  input: BetterAuthErrorInput,
): MappedAuthError {
  const code = typeof input === "string" ? input : input.code;
  const customMessage = typeof input === "object" ? input.message : undefined;
  const mapping = TABLE[code] ?? FALLBACK;
  return {
    code: mapping.code,
    variant: mapping.variant,
    message: customMessage ?? mapping.message,
  };
}

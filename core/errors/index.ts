/**
 * Errores tipados del sistema.
 *
 * Reglas:
 *   1. Toda capa que pueda fallar lanza una subclase de `AppError`.
 *   2. Cada error tiene un `code` único (string literal) para discriminación
 *      sin parsear mensajes.
 *   3. El cliente usa `instanceof` para mapear a UI; nunca compara strings.
 *
 * Convex lanza `ConvexError` con un shape `{ code, message }` desde el backend.
 * Este módulo define las clases que el cliente usa para envolver esos errores.
 */

export type ErrorCode =
  // Auth
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "SESSION_EXPIRED"
  | "AUTH_PASSKEY_SECURITY_ERROR"
  | "AUTH_PASSKEY_NETWORK_ERROR"
  | "AUTH_PASSKEY_EXPIRED"
  | "AUTH_USER_NOT_FOUND"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_EMAIL_TAKEN"
  | "AUTH_UNKNOWN_ERROR"
  // Validación
  | "VALIDATION_ERROR"
  | "INVALID_INPUT"
  // Recurso
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "CONFLICT"
  // Regla de negocio
  | "NO_ACTIVE_CYCLE"
  | "CYCLE_ALREADY_CLOSED"
  | "INSUFFICIENT_FUNDS"
  | "INSUFFICIENT_ENVELOPE_BALANCE"
  | "OVER_BUDGET_LIMIT"
  // Sistema
  | "INTERNAL_ERROR"
  | "EXTERNAL_SERVICE_ERROR"
  | "RATE_LIMITED";

/**
 * Error base. Todos los errores de la app extienden de este.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly meta?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    options?: { meta?: Record<string, unknown>; cause?: unknown },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;
    this.code = code;
    this.meta = options?.meta;
  }

  /**
   * Convierte el error a un payload seguro para enviar al cliente.
   * Nunca expone stack traces ni mensajes crudos de infraestructura.
   */
  toJSON(): {
    code: ErrorCode;
    message: string;
    meta?: Record<string, unknown>;
  } {
    return {
      code: this.code,
      message: this.message,
      ...(this.meta ? { meta: this.meta } : {}),
    };
  }
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export class UnauthorizedError extends AppError {
  constructor(message = "No autorizado", meta?: Record<string, unknown>) {
    super("UNAUTHORIZED", message, { meta });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Acceso denegado", meta?: Record<string, unknown>) {
    super("FORBIDDEN", message, { meta });
  }
}

export class SessionExpiredError extends AppError {
  constructor(message = "Tu sesión ha expirado. Inicia sesión de nuevo.") {
    super("SESSION_EXPIRED", message);
  }
}

// ─── Validación ────────────────────────────────────────────────────────────

export class ValidationError extends AppError {
  constructor(
    message = "Los datos ingresados no son válidos",
    meta?: Record<string, unknown>,
  ) {
    super("VALIDATION_ERROR", message, { meta });
  }
}

export class InvalidInputError extends AppError {
  constructor(field: string, reason: string) {
    super("INVALID_INPUT", `${field}: ${reason}`, { meta: { field, reason } });
  }
}

// ─── Recurso ───────────────────────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      "NOT_FOUND",
      id
        ? `${resource} con id "${id}" no encontrado`
        : `${resource} no encontrado`,
      { meta: { resource, id } },
    );
  }
}

export class AlreadyExistsError extends AppError {
  constructor(resource: string, meta?: Record<string, unknown>) {
    super("ALREADY_EXISTS", `${resource} ya existe`, { meta });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super("CONFLICT", message, { meta });
  }
}

// ─── Reglas de negocio (Quipu) ─────────────────────────────────────────────

export class NoActiveCycleError extends AppError {
  constructor(message = "No hay un ciclo activo para esta operación") {
    super("NO_ACTIVE_CYCLE", message);
  }
}

export class CycleAlreadyClosedError extends AppError {
  constructor(message = "Este ciclo ya fue cerrado y no puede modificarse") {
    super("CYCLE_ALREADY_CLOSED", message);
  }
}

export class InsufficientFundsError extends AppError {
  constructor(envelope: string, requested: number, available: number) {
    super(
      "INSUFFICIENT_FUNDS",
      `Saldo insuficiente en ${envelope}: necesitas ${requested}, tienes ${available}`,
      { meta: { envelope, requested, available } },
    );
  }
}

export class OverBudgetLimitError extends AppError {
  constructor(envelope: string, limit: number) {
    super(
      "OVER_BUDGET_LIMIT",
      `La operación excede el límite del sobre ${envelope} (${limit})`,
      { meta: { envelope, limit } },
    );
  }
}

// ─── Sistema ───────────────────────────────────────────────────────────────

export class InternalError extends AppError {
  constructor(message = "Error interno del servidor", cause?: unknown) {
    super("INTERNAL_ERROR", message, { cause });
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, cause?: unknown) {
    super("EXTERNAL_SERVICE_ERROR", `Error al comunicarse con ${service}`, {
      meta: { service },
      cause,
    });
  }
}

export class RateLimitedError extends AppError {
  constructor(retryAfter?: number) {
    super(
      "RATE_LIMITED",
      "Demasiadas solicitudes. Intenta de nuevo en un momento.",
      {
        meta: retryAfter ? { retryAfter } : undefined,
      },
    );
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Mapea un error desconocido a un `AppError`. Útil en catch blocks donde
 * el tipo del error es `unknown`.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    return new InternalError(error.message, error);
  }
  return new InternalError("Error desconocido");
}

/**
 * Discrimina errores de Convex (que vienen como `ConvexError`) a `AppError`.
 *
 * El backend debe lanzar `ConvexError({ code, message, meta? })` con códigos
 * válidos del enum `ErrorCode`. El cliente crea siempre un `AppError` base con
 * el `code` correspondiente: las subclases específicas se usan cuando se
 * construyen errores desde el cliente; para errores del backend, basta con
 * `error.code` para discriminar.
 */
export function fromConvexError(error: unknown): AppError {
  // ConvexError tiene un shape específico: { data: unknown, message: string }.
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data: unknown }).data;
    if (data && typeof data === "object" && "code" in data) {
      const code = (data as { code: ErrorCode }).code;
      const message =
        (data as { message?: string }).message ?? "Error del servidor";
      const meta = (data as { meta?: Record<string, unknown> }).meta;
      return new AppError(code, message, { meta });
    }
  }
  return toAppError(error);
}

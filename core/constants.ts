/**
 * Constantes globales de Quipu.
 *
 * Solo constantes genuinamente transversales (no de un dominio específico).
 * Constantes de un dominio viven en `modules/[domain]/constants.ts`.
 */

export const APP_NAME = "Quipu";
export const APP_TAGLINE = "Tu sueldo, con disciplina.";

export const LIMA_TIMEZONE = "America/Lima";

/**
 * Moneda por defecto. Multi-moneda se manejará cuando se implemente.
 */
export const DEFAULT_CURRENCY = {
  code: "PEN",
  symbol: "S/",
  label: "Sol peruano",
} as const;

/**
 * Default allocations (50/30/20). Se usan al crear el perfil si el usuario
 * no especifica otros. Validar con `isValidAllocations` antes de persistir.
 */
export const DEFAULT_ALLOCATIONS = {
  needs: 50,
  wants: 30,
  savings: 20,
} as const;

/**
 * Versión actual del schema de Convex. Útil para migrations y debugging.
 */
export const SCHEMA_VERSION = 1 as const;

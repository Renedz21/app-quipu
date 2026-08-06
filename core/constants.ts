export { LIMA_TIMEZONE } from "@/shared/constants/timezone";

/**
 * Moneda por defecto. Multi-moneda se manejará cuando se implemente.
 */
export const DEFAULT_CURRENCY = {
  code: "PEN",
  symbol: "S/",
  label: "Sol peruano",
} as const;

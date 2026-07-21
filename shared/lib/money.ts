/**
 * Utilidades de dinero para Quipu.
 *
 * Regla de oro: el backend trabaja en **céntimos enteros** (números).
 * La UI formatea a soles para mostrar, parsea a céntimos para enviar.
 * Este módulo es la única puerta de entrada — nunca formatees soles a mano
 * en un componente.
 */

import { DEFAULT_CURRENCY } from "@/core/constants";

/**
 * Tipo monetario. Siempre céntimos enteros (sin coma flotante).
 */
export type Cents = number;

/**
 * Formatea céntimos a string monetario localizado.
 *
 * @example
 * formatCents(123456) // "S/ 1,234.56" (con locale es-PE)
 * formatCents(0) // "S/ 0.00"
 */
export function formatCents(
  cents: Cents,
  options?: {
    currency?: string;
    locale?: string;
    showSymbol?: boolean;
    minimumFractionDigits?: number;
  },
): string {
  const {
    currency = DEFAULT_CURRENCY.code,
    locale = "es-PE",
    showSymbol = true,
    minimumFractionDigits = 2,
  } = options ?? {};

  const formatter = new Intl.NumberFormat(locale, {
    style: showSymbol ? "currency" : "decimal",
    currency,
    minimumFractionDigits,
    maximumFractionDigits: 2,
  });

  return formatter.format(cents / 100);
}

/**
 * Formatea céntimos a un formato compacto para dashboards/resúmenes.
 *
 * @example
 * formatCentsCompact(1500000) // "S/ 15K"
 * formatCentsCompact(150000) // "S/ 1.5K"
 */
export function formatCentsCompact(cents: Cents, locale = "es-PE"): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: DEFAULT_CURRENCY.code,
    notation: "compact",
    maximumFractionDigits: 1,
  });
  return formatter.format(cents / 100);
}

/**
 * Parsea un input del usuario a céntimos enteros.
 *
 * Acepta formatos:
 *   - "1234"      → 123400
 *   - "1234.56"   → 123456
 *   - "1,234.56"  → 123456
 *   - "1.234,56"  → 123456 (formato europeo)
 *   - "S/ 1234.56" → 123456
 *   - "1234,56"   → 123456 (asumiendo coma decimal en es-PE)
 *
 * Retorna null si el string no es parseable.
 */
export function parseToCents(input: string): Cents | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Quitar símbolo de moneda y espacios.
  const cleaned = trimmed.replace(/[S$/€£¥₹]/g, "").trim();
  if (!cleaned) return null;

  // Detectar formato: si tiene "," y ".", el último es el decimal.
  // Si solo tiene ",", puede ser decimal (es-PE) o miles (en-US).
  // Asumimos decimal si hay exactamente una coma y ≤ 2 dígitos después.
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  let normalized: string;
  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandSep = decimalSep === "," ? "." : ",";
    normalized = cleaned.split(thousandSep).join("").replace(decimalSep, ".");
  } else if (hasComma) {
    const parts = cleaned.split(",");
    if (parts.length === 2 && parts[1] !== undefined && parts[1].length <= 2) {
      // Decimal
      normalized = `${parts[0]}.${parts[1]}`;
    } else {
      // Miles
      normalized = parts.join("");
    }
  } else {
    normalized = cleaned;
  }

  const num = Number(normalized);
  if (!Number.isFinite(num) || num < 0) return null;

  return Math.round(num * 100);
}

/**
 * Valida que un valor sea céntimos válidos (entero no negativo).
 */
export function isValidCents(value: unknown): value is Cents {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/**
 * Suma un array de céntimos. Lanza si hay valor inválido.
 */
export function sumCents(values: Cents[]): Cents {
  return values.reduce((acc, v) => {
    if (!isValidCents(v)) throw new Error(`Valor inválido: ${v}`);
    return acc + v;
  }, 0);
}

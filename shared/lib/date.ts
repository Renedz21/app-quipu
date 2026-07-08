/**
 * Utilidades de fecha para Quipu.
 *
 * Toda la app opera en timezone `America/Lima`. Este módulo centraliza los
 * helpers para evitar repetir `Intl.DateTimeFormat` por todos lados.
 */

import { LIMA_TIMEZONE } from "@/core/constants";

/**
 * Día del mes en timezone Lima (1-31).
 */
export function getLimaDay(timestamp: number = Date.now()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: LIMA_TIMEZONE,
      day: "numeric",
    }).format(new Date(timestamp)),
  );
}

/**
 * Mes en timezone Lima (1-12).
 */
export function getLimaMonth(timestamp: number = Date.now()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: LIMA_TIMEZONE,
      month: "numeric",
    }).format(new Date(timestamp)),
  );
}

/**
 * Año en timezone Lima.
 */
export function getLimaYear(timestamp: number = Date.now()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: LIMA_TIMEZONE,
      year: "numeric",
    }).format(new Date(timestamp)),
  );
}

/**
 * Formatea una fecha en formato corto localizado.
 *
 * @example
 * formatLimaDate(1700000000000) // "14 nov 2024"
 */
export function formatLimaDate(timestamp: number, locale = "es-PE"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: LIMA_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

/**
 * Formatea una fecha con hora.
 *
 * @example
 * formatLimaDateTime(1700000000000) // "14 nov 2024, 15:30"
 */
export function formatLimaDateTime(
  timestamp: number,
  locale = "es-PE",
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: LIMA_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

/**
 * Días restantes entre hoy y una fecha objetivo.
 * Negativo si ya pasó.
 */
export function daysUntil(
  targetTimestamp: number,
  now: number = Date.now(),
): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.ceil((targetTimestamp - now) / MS_PER_DAY);
}

/**
 * Calcula la próxima fecha de cobro según el día del mes en Lima.
 * Si el día ya pasó este mes, devuelve el del mes siguiente.
 *
 * @param paydays - días del mes en que se cobra (1-31)
 */
export function getNextPayday(
  paydays: number[],
  now: number = Date.now(),
): number {
  const today = getLimaDay(now);
  const month = getLimaMonth(now);
  const year = getLimaYear(now);

  // Buscar el próximo día de pago en el mes actual.
  const sorted = [...paydays].sort((a, b) => a - b);
  const nextThisMonth = sorted.find((d) => d > today);

  if (nextThisMonth !== undefined) {
    return timestampForLimaDate(year, month, nextThisMonth);
  }

  // Si no hay más este mes, primer día de pago del mes siguiente.
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const firstPayday = sorted[0] ?? 1;
  return timestampForLimaDate(nextYear, nextMonth, firstPayday);
}

/**
 * Construye un timestamp para una fecha específica en Lima, al inicio del día.
 */
function timestampForLimaDate(
  year: number,
  month: number,
  day: number,
): number {
  // Construimos un ISO string asumiendo Lima y luego lo parseamos.
  // Usamos el truco de -05:00 (Lima no tiene DST, offset fijo -05).
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00-05:00`;
  return new Date(iso).getTime();
}

/**
 * Indica si un día dado de Lima es el primero o segundo día de pago del mes.
 * Devuelve `null` si no es un día de pago.
 */
export function isPayday(
  paydays: number[],
  now: number = Date.now(),
): { isPayday: true; isFirst: boolean } | { isPayday: false } {
  const today = getLimaDay(now);
  const sorted = [...paydays].sort((a, b) => a - b);
  const idx = sorted.indexOf(today);
  if (idx === -1) return { isPayday: false };
  return { isPayday: true, isFirst: idx === 0 };
}

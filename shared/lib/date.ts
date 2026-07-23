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

export type LimaDateParts = {
  year: number;
  month: number;
  day: number;
};

/**
 * Partes de calendario (año/mes/día) en timezone Lima.
 */
export function getLimaDateParts(timestamp: number): LimaDateParts {
  return {
    year: getLimaYear(timestamp),
    month: getLimaMonth(timestamp),
    day: getLimaDay(timestamp),
  };
}

/**
 * Construye un timestamp para una fecha específica en Lima, al inicio del día.
 */
export function limaDatePartsToTimestamp(parts: LimaDateParts): number {
  return timestampForLimaDate(parts.year, parts.month, parts.day);
}

function timestampForLimaDate(
  year: number,
  month: number,
  day: number,
): number {
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00-05:00`;
  return new Date(iso).getTime();
}

/**
 * Inicio del día de Lima para un instante dado (p. ej. "hoy" en Lima).
 */
export function limaStartOfDay(timestamp: number = Date.now()): number {
  return limaDatePartsToTimestamp(getLimaDateParts(timestamp));
}

export function isSameLimaDay(a: number, b: number): boolean {
  const partsA = getLimaDateParts(a);
  const partsB = getLimaDateParts(b);
  return (
    partsA.year === partsB.year &&
    partsA.month === partsB.month &&
    partsA.day === partsB.day
  );
}

/** Valor para `<input type="date">` en Lima (YYYY-MM-DD). */
export function limaDateToInputValue(timestamp: number): string {
  const { year, month, day } = getLimaDateParts(timestamp);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Formato corto para escribir a mano (dd/mm/aaaa) en Lima. */
export function limaDateToDisplayValue(timestamp: number): string {
  const { year, month, day } = getLimaDateParts(timestamp);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

/** Parsea dd/mm/aaaa como día en Lima; null si es inválido. */
export function parseLimaDisplayDateInput(value: string): number | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return parseLimaDateInput(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  );
}

/** Parsea YYYY-MM-DD como día en Lima; null si es inválido. */
export function parseLimaDateInput(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const timestamp = limaDatePartsToTimestamp({ year, month, day });
  const roundTrip = getLimaDateParts(timestamp);
  if (
    roundTrip.year !== year ||
    roundTrip.month !== month ||
    roundTrip.day !== day
  ) {
    return null;
  }

  return timestamp;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Límite inferior razonable para fechas retroactivas de ingreso (1 año). */
export function limaIncomeDateMinTimestamp(now: number = Date.now()): number {
  return limaStartOfDay(now) - 365 * MS_PER_DAY;
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

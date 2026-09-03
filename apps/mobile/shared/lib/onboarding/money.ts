const MAX_INTEGER_DIGITS = 9;

/** Normaliza lo que escribe el usuario a un string de soles con punto decimal. */
export function sanitizeSolesInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.,]/g, "");
  if (!cleaned) return "";

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  const lastSep = Math.max(lastDot, lastComma);

  if (lastSep === -1) {
    return cleaned.slice(0, MAX_INTEGER_DIGITS);
  }

  const before = cleaned.slice(0, lastSep).replace(/[.,]/g, "");
  const after = cleaned.slice(lastSep + 1).replace(/[.,]/g, "");
  const sep = cleaned[lastSep];

  if (sep === "," && after.length > 2) {
    return (before + after).slice(0, MAX_INTEGER_DIGITS);
  }

  const intPart = before.slice(0, MAX_INTEGER_DIGITS);
  const frac = after.slice(0, 2);
  if (frac.length === 0) return `${intPart}.`;
  return `${intPart}.${frac}`;
}

export function parseSolesToCents(raw: string): number {
  const sanitized = sanitizeSolesInput(raw);
  if (!sanitized || sanitized === ".") return 0;
  const [intPart, fracPart = ""] = sanitized.split(".");
  const whole = Number(intPart || "0");
  if (!Number.isFinite(whole)) return 0;
  const cents = Number(fracPart.padEnd(2, "0").slice(0, 2) || "0");
  return whole * 100 + cents;
}

export function formatCentsForInput(cents: number): string {
  if (cents <= 0) return "";
  const whole = Math.floor(cents / 100);
  const rem = cents % 100;
  if (rem === 0) return String(whole);
  return `${whole}.${String(rem).padStart(2, "0")}`;
}

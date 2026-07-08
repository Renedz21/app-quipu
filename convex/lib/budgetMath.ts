import type { Doc } from "../_generated/dataModel";

export const OVER_BUDGET_BUFFER = 0.05;
export const WANTS_BURN_RATE_THRESHOLD = 0.6;
// v2.5: 4 cadencias soportadas. `variable` no usa paydays (el usuario
// anota cada ingreso manual); `weekly` usa un solo día por simplicidad
// (el frame de onboarding del paso 3 lo trata como "Lo apunto yo"
// pero con cadencia semanal).
export const CYCLE_DAYS = {
  biweekly: 15,
  monthly: 30,
  weekly: 7,
  variable: 15, // v2.5 initial: igual a HORIZON_DAYS de incomeEvents.
} as const;
export const ENVELOPE_TYPES = ["needs", "wants", "savings"] as const;
export const SECOND_PAYDAY_FALLBACK = 15;

export type PayFrequency = keyof typeof CYCLE_DAYS;
export type EnvelopeType = (typeof ENVELOPE_TYPES)[number];

type EnvelopeCompliance = Pick<
  Doc<"envelopes">,
  "type" | "remainingAmount" | "allocatedAmount"
>;
type AllocationWeights = Pick<
  Doc<"profiles">,
  "allocationNeeds" | "allocationWants" | "allocationSavings"
>;

// Rescate: cubre el déficit real de wants, topado por el saldo disponible en ahorros.
export function computeRescueTransfer(
  savingsRemaining: number,
  wantsRemaining: number,
): number {
  const deficit = wantsRemaining < 0 ? Math.abs(wantsRemaining) : 0;
  return Math.min(savingsRemaining, deficit);
}

// v2.5: el coach sugiere, no aplica. Devuelve cuánto transferir y el déficit
// proyectado para que la UI muestre un paso de confirmación.
export function suggestRescueTransfer(
  savingsRemaining: number,
  wantsRemaining: number,
): { transfer: number; projectedDeficit: number } {
  const projectedDeficit = wantsRemaining < 0 ? Math.abs(wantsRemaining) : 0;
  const transfer = Math.min(savingsRemaining, projectedDeficit);
  return { transfer, projectedDeficit };
}

// Alerta si quemó >60% de Gustos antes de pasar la mitad del ciclo (derivada del propio ciclo).
export function shouldWarnWantsBurn(p: {
  allocated: number;
  remaining: number;
  cycleStart: number;
  cycleEnd: number;
  now: number;
}): boolean {
  const { allocated, remaining, cycleStart, cycleEnd, now } = p;
  if (allocated <= 0) return false;
  const burnRate = (allocated - remaining) / allocated;
  return (
    burnRate > WANTS_BURN_RATE_THRESHOLD &&
    now - cycleStart < (cycleEnd - cycleStart) / 2
  );
}

export function evaluateCycleCompliance(
  envelopes: EnvelopeCompliance[],
): "compliant" | "warning" | "failed" {
  let hasWarning = false;
  for (const { type, remainingAmount, allocatedAmount } of envelopes) {
    if (type === "savings" || remainingAmount >= 0) continue;
    if (Math.abs(remainingAmount) > allocatedAmount * OVER_BUDGET_BUFFER)
      return "failed";
    hasWarning = true;
  }
  return hasWarning ? "warning" : "compliant";
}

// Reparto entero con largest-remainder: los céntimos sobrantes van a las mayores
// partes fraccionarias, garantizando que los 3 sobres sumen exacto el neto.
export function computeAllocations(
  netAvailableCents: number,
  weights: AllocationWeights,
): Record<EnvelopeType, number> {
  const w: Record<EnvelopeType, number> = {
    needs: weights.allocationNeeds,
    wants: weights.allocationWants,
    savings: weights.allocationSavings,
  };
  const total = w.needs + w.wants + w.savings;
  if (total <= 0)
    throw new Error("La distribución del perfil es inválida (suma 0).");

  const parts = ENVELOPE_TYPES.map((type) => {
    const exact = (netAvailableCents * w[type]) / total;
    const floor = Math.floor(exact);
    return { type, floor, frac: exact - floor };
  });

  const result: Record<EnvelopeType, number> = {
    needs: 0,
    wants: 0,
    savings: 0,
  };
  for (const p of parts) result[p.type] = p.floor;

  let remainder =
    netAvailableCents - parts.reduce((acc, p) => acc + p.floor, 0);
  const byFracDesc = [...parts].sort((a, b) => b.frac - a.frac);
  for (let i = 0; remainder > 0; i++, remainder--) {
    const part = byFracDesc[i % byFracDesc.length];
    if (part) result[part.type] += 1;
  }

  return result;
}

export function isValidAllocations(
  needs: number,
  wants: number,
  savings: number,
): boolean {
  return (
    [needs, wants, savings].every((n) => Number.isInteger(n) && n >= 0) &&
    needs + wants + savings === 100
  );
}

export function isValidPaydays(
  payFrequency: PayFrequency,
  paydays: number[],
): boolean {
  if (paydays.some((d) => !Number.isInteger(d) || d < 1 || d > 31))
    return false;
  // `variable` no requiere paydays (el usuario anota manualmente).
  if (payFrequency === "variable") return true;
  if (payFrequency === "biweekly") return paydays.length >= 2;
  // monthly, weekly: ≥ 1 día.
  return paydays.length >= 1;
}

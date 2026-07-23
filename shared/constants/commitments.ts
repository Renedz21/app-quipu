export { ENVELOPE_LABELS } from "@/shared/constants/envelopes";

export const COVERAGE_COVERED_HEADER = "Todo está cubierto";
export const COVERAGE_UNCOVERED_HEADER = "Faltan por cubrir";

export const ADD_COMMITMENT_CTA = "+ Agregar compromiso";
export const ADD_COMMITMENT_TITLE = "Nuevo compromiso";
export const COMMITMENT_NAME_LABEL = "Nombre";
export const COMMITMENT_AMOUNT_LABEL = "Monto (S/)";
export const COMMITMENT_DUE_LABEL = "Día del mes";
export const COMMITMENT_ENVELOPE_LABEL = "Sobre";
export const COMMITMENT_CREATED_TOAST = "Compromiso agregado.";

export function formatDueInDays(daysUntilDue: number): string {
  if (daysUntilDue === 0) return "hoy";
  if (daysUntilDue === 1) return "en 1 día";
  return `en ${daysUntilDue} días`;
}

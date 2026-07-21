import type { IncomeSource } from "./types";

export const INCOME_PAGE_TITLE = "Registrar ingreso";
export const INCOME_PAGE_SUBTITLE =
  "Solo manual. Tú decides qué entra y cuándo.";
export const INCOME_AMOUNT_LABEL = "Monto recibido";
export const INCOME_SOURCE_LABEL = "Origen";
export const INCOME_DATE_LABEL = "Fecha";
export const INCOME_CONCEPT_LABEL = "Concepto";
export const INCOME_CONCEPT_OPTIONAL = "· opcional";
export const INCOME_IMPACT_TITLE = "Impacto en tus sobres";
export const INCOME_NEW_DAILY_LABEL = "Nuevo disponible hoy";
export const INCOME_CANCEL_CTA = "Volver";
export const INCOME_SUBMIT_CTA = "Registrar ingreso";
export const INCOME_SUCCESS_TITLE = "Ingreso registrado";
export const INCOME_SUCCESS_BODY_PREFIX = "ya se repartieron.";
export const INCOME_SUCCESS_BODY_SUFFIX = "Tu ciclo respira mejor.";
export const INCOME_SUCCESS_DAILY_LABEL = "Disponible hoy ahora";
export const INCOME_HOME_CTA = "Volver al inicio";

export const INCOME_SOURCE_OPTIONS: ReadonlyArray<{
  value: IncomeSource;
  label: string;
}> = [
  { value: "payroll", label: "Sueldo" },
  { value: "freelance", label: "Proyecto" },
  { value: "business", label: "Negocio" },
  { value: "gift", label: "Regalo" },
  { value: "refund", label: "Devolución" },
  { value: "investment", label: "Inversión" },
  { value: "other", label: "Otro" },
];

export function getIncomeSourceLabel(source: IncomeSource): string {
  return (
    INCOME_SOURCE_OPTIONS.find((option) => option.value === source)?.label ??
    "Ingreso"
  );
}

export const ENVELOPE_INCOME_STYLES = {
  needs: {
    dot: "bg-steel",
    track: "bg-steel-soft",
    bar: "bg-steel",
  },
  wants: {
    dot: "bg-clay",
    track: "bg-clay-soft",
    bar: "bg-clay",
  },
  savings: {
    dot: "bg-moss",
    track: "bg-moss-soft",
    bar: "bg-moss",
  },
} as const;

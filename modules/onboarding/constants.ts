/**
 * Constantes del módulo onboarding.
 *
 * Aquí viven:
 * - Identificadores de pasos y helpers puros.
 * - Defaults del state (los mismos que va a usar el `onboarding-provider`
 *   para inicializar el reducer y el `completeOnboardingAction` para
 *   completar el payload si vienen campos faltantes).
 * - Mensajes de error en español (los usa el `commitment-form-dialog`,
 *   el `step-5-allocations.tsx` y el manejo de `ConvexError`).
 */

import type {
  CommitmentDraft,
  IncomeModel,
  OnboardingState,
  PayFrequency,
} from "./types";

/** IDs de los 8 pasos del wizard, en orden. */
export const STEP_IDS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/** Tipo derivado de STEP_IDS. Cualquier numero fuera de este set es inválido. */
export type StepId = (typeof STEP_IDS)[number];

/** Cantidad total de pasos. */
export const STEP_COUNT = STEP_IDS.length;

/**
 * Parsea un string (`?step=3`) a `StepId`. Retorna `null` si el input
 * no es un número válido dentro del set `STEP_IDS`. La página usa esto
 * para validar el query param antes de pasar el step al wizard.
 */
export function parseStepId(input: string | undefined): StepId | null {
  if (!input) return null;
  const n = Number.parseInt(input, 10);
  if (!Number.isFinite(n)) return null;
  return STEP_IDS.includes(n as StepId) ? (n as StepId) : null;
}

/**
 * Defaults del state. El usuario puede cambiar casi todo durante el
 * wizard; estos son los valores iniciales que hidratan el reducer.
 *
 * - `country` y currency hardcoded a Perú/PEN: multi-moneda está fuera
 *   de scope para v2.5 (ver §10 del spec).
 * - `allocation{Needs|Wants|Savings}` arrancan en 50/30/20 que es lo
 *   que muestra el pill "Recomiendan 50/30/20" del paso 5.
 */
export const ONBOARDING_DEFAULTS = {
  name: "",
  incomeModel: null as IncomeModel | null,
  payFrequency: null as PayFrequency | null,
  paydays: [] as number[],
  allocationNeeds: 50,
  allocationWants: 30,
  allocationSavings: 20,
  commitments: [] as CommitmentDraft[],
  country: "Perú",
  currencyCode: "PEN",
  currencySymbol: "S/",
} as const;

/** Estado inicial del wizard (shape completo, listo para `useReducer`). */
export const INITIAL_ONBOARDING_STATE: OnboardingState = {
  currentStep: 1,
  ...ONBOARDING_DEFAULTS,
};

/**
 * Mensajes de error en español, indexados por código interno.
 * El cliente los usa para mapear `ConvexError.code` o errores de
 * validación Zod a copy legible. Centralizado para que cambiar el
 * wording sea un solo edit.
 */
export const ERROR_MESSAGES: Record<string, string> = {
  name_required: "Necesitamos un nombre para continuar.",
  name_too_long: "El nombre debe tener máximo 60 caracteres.",
  income_model_required: "Elige cómo son tus ingresos.",
  frequency_required: "Elige cada cuánto cobras.",
  paydays_invalid: "Los días de pago no son válidos.",
  allocations_invalid: "El reparto debe sumar exactamente 100%.",
  commitment_name_required: "El nombre del compromiso es obligatorio.",
  commitment_amount_invalid: "El monto debe ser mayor a cero.",
  worker_type_required: "Cuéntanos cómo trabajas para terminar.",
  network: "No pudimos guardar tu configuración. Revisa tu conexión e intenta de nuevo.",
  conflict: "Ya tienes un perfil creado. Te llevamos a tu resumen.",
};

/**
 * Labels visibles de los income models (paso 2). Centralizados para que
 * el copy de las radio-cards no se duplique entre el componente y los
 * mensajes de error.
 */
export const INCOME_MODEL_LABELS: Record<IncomeModel, { title: string; subtitle: string }> = {
  fixed: { title: "Fijos", subtitle: "Sueldo o planilla, fechas fijas." },
  variable: { title: "Variables", subtitle: "Freelance, negocio, proyectos." },
  mixed: { title: "Mixtos", subtitle: "Un sueldo base + ingresos extra." },
};

/**
 * Labels visibles de las cadencias (paso 3).
 */
export const PAY_FREQUENCY_LABELS: Record<PayFrequency, { title: string; subtitle: string }> = {
  monthly: { title: "Mensual", subtitle: "1 vez al mes" },
  biweekly: { title: "Quincenal", subtitle: "Cada 15 días" },
  weekly: { title: "Semanal", subtitle: "Cada 7 días" },
  variable: { title: "Variable", subtitle: "Lo apunto yo" },
};

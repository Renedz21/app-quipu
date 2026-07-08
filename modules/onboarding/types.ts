/**
 * Tipos del cliente para el wizard de onboarding v2.5.
 *
 * Regla: NO redeclarar `Doc`/`Id` de Convex. Los tipos del backend viven
 * en `convex/_generated/dataModel`. Acá definimos el shape del state del
 * wizard (cliente) y los DTOs que viajamos a Convex en el submit final.
 *
 * Este archivo NO contiene tipos de los datos persistidos. Esos vienen
 * del schema Convex vía `api.profiles.createProfile` y
 * `api.fixedCommitments.createCommitmentsBulk`.
 */

/**
 * Cómo organiza el usuario sus ingresos. Decidido en el paso 2 del wizard.
 * - "fixed": sueldo o planilla con fechas conocidas.
 * - "variable": freelance, negocio, sin cadencia fija.
 * - "mixed": sueldo base + ingresos extra variables.
 */
export type IncomeModel = "fixed" | "variable" | "mixed";

/**
 * Cadencia con la que entra dinero. Decidido en el paso 3.
 * - "monthly": 1 vez al mes (1 payday).
 * - "biweekly": cada 15 días (2 paydays).
 * - "weekly": cada 7 días (sin días específicos, el usuario anota).
 * - "variable": sin cadencia, cada ingreso se anota manualmente.
 */
export type PayFrequency = "monthly" | "biweekly" | "weekly" | "variable";

/**
 * Cómo trabaja el usuario. Decidido en el paso 7 (summary).
 * Sirve para configurar copy futuro (no afecta el ciclo financiero).
 * - "dependent": planilla, quinto mes, beneficios laborales.
 * - "independent": freelance, negocio propio, sin planilla.
 */
export type WorkerType = "dependent" | "independent";

/**
 * Frecuencia de un compromiso fijo. Cada uno descuenta de su sobre.
 * - "monthly": una vez al mes (cualquier día).
 * - "first_payday": descuenta en el primer pago del ciclo.
 * - "second_payday": descuenta en el segundo pago del ciclo (biweekly).
 * - "every_payday": descuenta en ambos pagos del ciclo.
 */
export type CommitmentFrequency =
  | "monthly"
  | "first_payday"
  | "second_payday"
  | "every_payday";

/**
 * Sobre al que se descuenta un compromiso fijo.
 * Solo "needs" o "wants" por diseño (savings no toca compromisos fijos).
 */
export type CommitmentEnvelope = "needs" | "wants";

/**
 * Un compromiso fijo en borrador (antes de persistir).
 * `amountCents` está en céntimos enteros para evitar floats.
 */
export type CommitmentDraft = {
  name: string;
  amountCents: number;
  frequency: CommitmentFrequency;
  envelope: CommitmentEnvelope;
};

/**
 * Paso actual del wizard, 1-8.
 * - 1: bienvenida + nombre.
 * - 2: modelo de ingresos.
 * - 3: frecuencia + días.
 * - 4: preview del ciclo (read-only).
 * - 5: porcentajes de reparto.
 * - 6: compromisos fijos.
 * - 7: summary + worker type (último editable, dispara el submit).
 * - 8: confirmación final (server-rendered tras redirect del action).
 */
export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * State completo del wizard. Vive en cliente, se hidrata desde
 * `sessionStorage` (con fallback a `localStorage` en el slice 8).
 *
 * Defaults: `allocation{Needs|Wants|Savings}` arrancan en 50/30/20
 * (clásico "Recomiendan 50/30/20" del step 5). El resto arranca en null
 * o `[]` para forzar al usuario a elegir antes de continuar.
 */
export type OnboardingState = {
  currentStep: OnboardingStep;
  name: string;
  incomeModel: IncomeModel | null;
  payFrequency: PayFrequency | null;
  paydays: number[];
  allocationNeeds: number;
  allocationWants: number;
  allocationSavings: number;
  commitments: CommitmentDraft[];
  workerType: WorkerType | null;
  country: string;
  currencyCode: string;
  currencySymbol: string;
};

/**
 * Constantes y tipos para los eventos de PostHog de Quipu 2.0.
 *
 * Reglas:
 *   1. Nunca usar strings literales para nombres de eventos. Siempre `AnalyticsEvents.X`.
 *   2. Las propiedades se tipan con Zod y se exportan como tipos via `z.infer`.
 *   3. Cualquier evento nuevo: agregar constante + schema + tipo en el mapa de payloads.
 *   4. Si una propiedad es dinero, va en **céntimos enteros** (consistente con `shared/lib/money`).
 *
 * Los nombres de eventos siguen snake_case (convención PostHog). Las propiedades
 * también snake_case, salvo que provengan de un campo tipado del schema (en ese
 * caso se mantiene la grafía del backend: `allocation_needs`, `cycle_id`).
 */

import { z } from "zod";

// ─── Enums compartidos ──────────────────────────────────────────────────────

export const AuthProviderSchema = z.enum(["email", "google", "apple"]);
export type AuthProvider = z.infer<typeof AuthProviderSchema>;

export const DeviceTypeSchema = z.enum(["mobile", "tablet", "desktop"]);
export type DeviceType = z.infer<typeof DeviceTypeSchema>;

export const PlatformSchema = z.enum(["android", "ios", "web"]);
export type Platform = z.infer<typeof PlatformSchema>;

export const SignInMethodSchema = z.enum(["password", "passkey"]);
export type SignInMethod = z.infer<typeof SignInMethodSchema>;

export const EnvelopeTypeSchema = z.enum(["needs", "wants", "savings"]);
export type EnvelopeType = z.infer<typeof EnvelopeTypeSchema>;

export const IncomeKindSchema = z.enum(["habitual", "extraordinary"]);
export type IncomeKind = z.infer<typeof IncomeKindSchema>;

export const IncomeTypeSchema = z.enum([
  "salary",
  "gratification",
  "cts",
  "bonus",
  "utilities",
  "freelance",
  "other",
]);
export type IncomeType = z.infer<typeof IncomeTypeSchema>;

export const AllocationModeSchema = z.enum([
  "default",
  "manual",
  "all_to_savings",
]);
export type AllocationMode = z.infer<typeof AllocationModeSchema>;

export const AdditionalSavingsSourceSchema = z.enum([
  "salary",
  "gratification",
  "cts",
  "bonus",
  "needs",
  "wants",
  "extraordinary",
]);
export type AdditionalSavingsSource = z.infer<
  typeof AdditionalSavingsSourceSchema
>;

export const CoachRecommendationTypeSchema = z.enum([
  "rescue_transfer",
  "freeze_wants",
  "adjust_cycle",
  "save_more",
  "insight",
]);
export type CoachRecommendationType = z.infer<
  typeof CoachRecommendationTypeSchema
>;

export const CoachInteractionSchema = z.enum(["selected", "dismissed"]);
export type CoachInteraction = z.infer<typeof CoachInteractionSchema>;

export const CrisisActionSchema = z.enum([
  "completed",
  "dismissed",
  "postponed",
]);
export type CrisisAction = z.infer<typeof CrisisActionSchema>;

// ─── Schemas de propiedades por evento ─────────────────────────────────────

const UserSignedUpProperties = z.object({
  provider: AuthProviderSchema,
  device_type: DeviceTypeSchema.optional(),
  platform: PlatformSchema.optional(),
});
export type UserSignedUpProperties = z.infer<typeof UserSignedUpProperties>;

const UserLoggedInProperties = z.object({
  method: SignInMethodSchema,
  days_since_last_login: z.number().int().nonnegative(),
});
export type UserLoggedInProperties = z.infer<typeof UserLoggedInProperties>;

const PasskeyCreatedProperties = z.object({}).strict();
export type PasskeyCreatedProperties = z.infer<typeof PasskeyCreatedProperties>;

const OnboardingStepProperties = z.object({
  step: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal("success"),
  ]),
});
export type OnboardingStepProperties = z.infer<typeof OnboardingStepProperties>;

const OnboardingCompletedProperties = z.object({
  worker_type: z.enum(["dependent", "independent", "mixed"]),
  pay_frequency: z
    .enum(["monthly", "biweekly", "weekly", "variable"])
    .optional(),
  allocation_needs: z.number().int().min(0).max(100),
  allocation_wants: z.number().int().min(0).max(100),
  allocation_savings: z.number().int().min(0).max(100),
  onboarding_duration_seconds: z.number().int().nonnegative(),
});
export type OnboardingCompletedProperties = z.infer<
  typeof OnboardingCompletedProperties
>;

const OnboardingAbandonedProperties = z.object({
  last_step: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal("success"),
  ]),
});
export type OnboardingAbandonedProperties = z.infer<
  typeof OnboardingAbandonedProperties
>;

const DashboardViewedProperties = z.object({
  cycle_id: z.string().optional(),
  is_new_cycle: z.boolean().optional(),
  days_remaining: z.number().int().nonnegative().optional(),
});
export type DashboardViewedProperties = z.infer<
  typeof DashboardViewedProperties
>;

const EnvelopeOpenedProperties = z.object({
  envelope_type: EnvelopeTypeSchema,
  sub_envelope_id: z.string().optional(),
});
export type EnvelopeOpenedProperties = z.infer<typeof EnvelopeOpenedProperties>;

const FinancialCycleProperties = z.object({
  cycle_id: z.string(),
  days_in_cycle: z.number().int().positive().optional(),
});
export type FinancialCycleProperties = z.infer<typeof FinancialCycleProperties>;

const IncomeRegisteredProperties = z.object({
  amount: z.number().int().positive(),
  envelope: EnvelopeTypeSchema,
  income_kind: IncomeKindSchema,
  income_type: IncomeTypeSchema,
  allocation_mode: AllocationModeSchema,
  cycle_id: z.string(),
  days_remaining_in_cycle: z.number().int().nonnegative().optional(),
  is_first_income: z.boolean().optional(),
});
export type IncomeRegisteredProperties = z.infer<
  typeof IncomeRegisteredProperties
>;

const ExtraIncomeRegisteredProperties = z.object({
  amount: z.number().int().positive(),
  type: z.enum(["gratification", "cts", "bonus", "utilities", "other"]),
  cycle_id: z.string(),
  distribution_policy: AllocationModeSchema,
});
export type ExtraIncomeRegisteredProperties = z.infer<
  typeof ExtraIncomeRegisteredProperties
>;

const ExpenseRegisteredProperties = z.object({
  amount: z.number().int().positive(),
  envelope: EnvelopeTypeSchema,
  category: z.string().optional(),
  cycle_id: z.string().optional(),
  days_remaining_in_cycle: z.number().int().nonnegative().optional(),
  entry_variant: z.enum(["fab", "envelope", "auto"]).optional(),
});
export type ExpenseRegisteredProperties = z.infer<
  typeof ExpenseRegisteredProperties
>;

const SavingsGoalCreatedProperties = z.object({
  goal_id: z.string().optional(),
  label: z.string().optional(),
  has_target: z.boolean(),
  target_amount: z.number().int().nonnegative().optional(),
});
export type SavingsGoalCreatedProperties = z.infer<
  typeof SavingsGoalCreatedProperties
>;

const AdditionalSavingsAddedProperties = z.object({
  amount: z.number().int().positive(),
  source: AdditionalSavingsSourceSchema,
  previous_target_percentage: z.number().int().min(0).max(100).optional(),
  goal_id: z.string().optional(),
});
export type AdditionalSavingsAddedProperties = z.infer<
  typeof AdditionalSavingsAddedProperties
>;

const SavingsContributionCompletedProperties = z.object({
  amount: z.number().int().positive(),
  source_envelope: z.enum(["needs", "wants"]),
  goal_id: z.string(),
  goal_label: z.string().optional(),
  is_emergency_fund: z.boolean(),
});
export type SavingsContributionCompletedProperties = z.infer<
  typeof SavingsContributionCompletedProperties
>;

const FixedCommitmentCreatedProperties = z.object({
  envelope: z.enum(["needs", "wants"]),
  due_day: z.number().int().min(1).max(31),
  amount: z.number().int().positive(),
  commitment_id: z.string().optional(),
});
export type FixedCommitmentCreatedProperties = z.infer<
  typeof FixedCommitmentCreatedProperties
>;

const AllocationModifiedProperties = z.object({
  previous_needs: z.number().int().min(0).max(100),
  previous_wants: z.number().int().min(0).max(100),
  previous_savings: z.number().int().min(0).max(100),
  new_needs: z.number().int().min(0).max(100),
  new_wants: z.number().int().min(0).max(100),
  new_savings: z.number().int().min(0).max(100),
  trigger: z.enum(["settings", "onboarding", "coach"]),
});
export type AllocationModifiedProperties = z.infer<
  typeof AllocationModifiedProperties
>;

const CoachRecommendationInteractedProperties = z.object({
  recommendation_type: CoachRecommendationTypeSchema,
  interaction: CoachInteractionSchema,
  trigger_event: z.string().optional(),
  transfer_amount: z.number().int().nonnegative().optional(),
});
export type CoachRecommendationInteractedProperties = z.infer<
  typeof CoachRecommendationInteractedProperties
>;

const CrisisRecommendationResolvedProperties = z.object({
  action: CrisisActionSchema,
  option_id: z.string(),
  cycle_id: z.string().optional(),
});
export type CrisisRecommendationResolvedProperties = z.infer<
  typeof CrisisRecommendationResolvedProperties
>;

const NotificationInteractedProperties = z.object({
  notification_id: z.string().optional(),
  notification_type: z.string().optional(),
});
export type NotificationInteractedProperties = z.infer<
  typeof NotificationInteractedProperties
>;

const SummaryViewedProperties = z.object({
  period: z.enum(["weekly", "monthly"]),
  cycle_id: z.string().optional(),
});
export type SummaryViewedProperties = z.infer<typeof SummaryViewedProperties>;

const FinancialInsightViewedProperties = z.object({
  insight_type: z.string(),
  cycle_id: z.string().optional(),
});
export type FinancialInsightViewedProperties = z.infer<
  typeof FinancialInsightViewedProperties
>;

// ─── Constantes de eventos ─────────────────────────────────────────────────

export const AnalyticsEvents = {
  // Auth
  USER_SIGNED_UP: "user_signed_up",
  USER_LOGGED_IN: "user_logged_in",
  USER_LOGGED_OUT: "user_logged_out",
  PASSKEY_CREATED: "passkey_created",

  // Onboarding
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_STEP_VIEWED: "onboarding_step_viewed",
  ONBOARDING_STEP_COMPLETED: "onboarding_step_completed",
  ONBOARDING_COMPLETED: "onboarding_completed",
  ONBOARDING_ABANDONED: "onboarding_abandoned",

  // Navegación
  DASHBOARD_VIEWED: "dashboard_viewed",
  ENVELOPE_OPENED: "envelope_opened",
  FINANCIAL_CYCLE_STARTED: "financial_cycle_started",
  FINANCIAL_CYCLE_CLOSED: "financial_cycle_closed",

  // Ingresos
  INCOME_REGISTERED: "income_registered",
  EXTRA_INCOME_REGISTERED: "extra_income_registered",

  // Gastos
  EXPENSE_REGISTERED: "expense_registered",

  // Ahorro
  SAVINGS_GOAL_CREATED: "savings_goal_created",
  ADDITIONAL_SAVINGS_ADDED: "additional_savings_added",
  SAVINGS_CONTRIBUTION_COMPLETED: "savings_contribution_completed",

  // Compromisos
  FIXED_COMMITMENT_CREATED: "fixed_commitment_created",

  // Cambios de estrategia
  ALLOCATION_MODIFIED: "allocation_modified",

  // Coach
  COACH_RECOMMENDATION_INTERACTED: "coach_recommendation_interacted",
  CRISIS_RECOMMENDATION_RESOLVED: "crisis_recommendation_resolved",

  // Engagement
  NOTIFICATION_CLICKED: "notification_clicked",
  NOTIFICATION_DISMISSED: "notification_dismissed",
  WEEKLY_SUMMARY_VIEWED: "weekly_summary_viewed",
  MONTHLY_SUMMARY_VIEWED: "monthly_summary_viewed",
  FINANCIAL_INSIGHT_VIEWED: "financial_insight_viewed",
} as const;

export type AnalyticsEvent =
  (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

// ─── Mapa tipado evento → payload ──────────────────────────────────────────
//
// `track()` usa este mapa para que las props correctas se exijan en cada
// call site. Es la única fuente de verdad entre el nombre y la shape.
//
// `{}` en un evento con propiedades vacías se valida como `Record<string, never>`
// — un objeto sin keys permitidas. Útil para forzar que no se envíe metadata
// accidental.

export type AnalyticsEventPayloads = {
  [AnalyticsEvents.USER_SIGNED_UP]: UserSignedUpProperties;
  [AnalyticsEvents.USER_LOGGED_IN]: UserLoggedInProperties;
  [AnalyticsEvents.USER_LOGGED_OUT]: Record<string, never>;
  [AnalyticsEvents.PASSKEY_CREATED]: PasskeyCreatedProperties;

  [AnalyticsEvents.ONBOARDING_STARTED]: Record<string, never>;
  [AnalyticsEvents.ONBOARDING_STEP_VIEWED]: OnboardingStepProperties;
  [AnalyticsEvents.ONBOARDING_STEP_COMPLETED]: OnboardingStepProperties;
  [AnalyticsEvents.ONBOARDING_COMPLETED]: OnboardingCompletedProperties;
  [AnalyticsEvents.ONBOARDING_ABANDONED]: OnboardingAbandonedProperties;

  [AnalyticsEvents.DASHBOARD_VIEWED]: DashboardViewedProperties;
  [AnalyticsEvents.ENVELOPE_OPENED]: EnvelopeOpenedProperties;
  [AnalyticsEvents.FINANCIAL_CYCLE_STARTED]: FinancialCycleProperties;
  [AnalyticsEvents.FINANCIAL_CYCLE_CLOSED]: FinancialCycleProperties;

  [AnalyticsEvents.INCOME_REGISTERED]: IncomeRegisteredProperties;
  [AnalyticsEvents.EXTRA_INCOME_REGISTERED]: ExtraIncomeRegisteredProperties;

  [AnalyticsEvents.EXPENSE_REGISTERED]: ExpenseRegisteredProperties;

  [AnalyticsEvents.SAVINGS_GOAL_CREATED]: SavingsGoalCreatedProperties;
  [AnalyticsEvents.ADDITIONAL_SAVINGS_ADDED]: AdditionalSavingsAddedProperties;
  [AnalyticsEvents.SAVINGS_CONTRIBUTION_COMPLETED]: SavingsContributionCompletedProperties;

  [AnalyticsEvents.FIXED_COMMITMENT_CREATED]: FixedCommitmentCreatedProperties;

  [AnalyticsEvents.ALLOCATION_MODIFIED]: AllocationModifiedProperties;

  [AnalyticsEvents.COACH_RECOMMENDATION_INTERACTED]: CoachRecommendationInteractedProperties;
  [AnalyticsEvents.CRISIS_RECOMMENDATION_RESOLVED]: CrisisRecommendationResolvedProperties;

  [AnalyticsEvents.NOTIFICATION_CLICKED]: NotificationInteractedProperties;
  [AnalyticsEvents.NOTIFICATION_DISMISSED]: NotificationInteractedProperties;
  [AnalyticsEvents.WEEKLY_SUMMARY_VIEWED]: SummaryViewedProperties;
  [AnalyticsEvents.MONTHLY_SUMMARY_VIEWED]: SummaryViewedProperties;
  [AnalyticsEvents.FINANCIAL_INSIGHT_VIEWED]: FinancialInsightViewedProperties;
};

// Helper de inferencia: dado un evento, devuelve su payload.
export type PayloadFor<E extends AnalyticsEvent> = AnalyticsEventPayloads[E];

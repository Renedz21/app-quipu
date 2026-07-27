import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * App-level schema.
 *
 * Only your own tables live here. Better Auth tables (`user`, `session`,
 * `account`, `passkey`, `verification`) are owned by the local `betterAuth`
 * component and are inferred into the generated `DataModel` automatically —
 * do not re-export them here.
 *
 * The `userId` field on your tables is a string that matches the
 * Better Auth user id. See `convex/profiles.ts` for the recommended way
 * to load a user + profile pair.
 */

export const appTables = {
  profiles: defineTable({
    userId: v.string(),
    name: v.string(),
    country: v.string(),
    currencyCode: v.string(), // e.g., "PEN"
    currencySymbol: v.string(), // e.g., "S/"

    // v2.5: how the user organizes their income cycle
    incomeModel: v.union(
      v.literal("fixed"),
      v.literal("variable"),
      v.literal("mixed"),
    ),
    cycleDurationDays: v.optional(v.number()), // 15 or 30 for variable income
    mixedFixedAmount: v.optional(v.number()), // centimos, estimado de la parte fija en modelo mixed
    variableIncomeSources: v.optional(v.array(v.string())), // labels libres de fuentes de ingreso variable

    // Cadencia con la que el usuario recibe su dinero.
    // v2.5: extendemos el union a 4 valores (semanal y variable son nuevos).
    // Slice B del onboarding endurezca a required cuando P0-2 cierre.
    payFrequency: v.optional(
      v.union(
        v.literal("monthly"),
        v.literal("biweekly"),
        v.literal("weekly"),
        v.literal("variable"),
      ),
    ),
    paydays: v.optional(v.array(v.number())), // e.g., [15, 30] para tus quincenas

    // Distribución del pre-compromiso (Madres de Contabilidad Mental)
    allocationNeeds: v.number(), // Default: 50
    allocationWants: v.number(), // Default: 30
    allocationSavings: v.number(), // Default: 20

    extraordinaryRules: v.optional(
      v.object({
        cts: v.union(
          v.literal("all_to_emergency_fund"),
          v.literal("profile_default"),
          v.literal("all_to_savings"),
          v.literal("ask_each_time"),
        ),
        gratifications: v.union(
          v.literal("all_to_emergency_fund"),
          v.literal("profile_default"),
          v.literal("all_to_savings"),
          v.literal("ask_each_time"),
        ),
        corporate_bonus: v.union(
          v.literal("all_to_emergency_fund"),
          v.literal("profile_default"),
          v.literal("all_to_savings"),
          v.literal("ask_each_time"),
        ),
        profit_sharing: v.union(
          v.literal("all_to_emergency_fund"),
          v.literal("profile_default"),
          v.literal("all_to_savings"),
          v.literal("ask_each_time"),
        ),
        custom: v.union(
          v.literal("all_to_emergency_fund"),
          v.literal("profile_default"),
          v.literal("all_to_savings"),
          v.literal("ask_each_time"),
        ),
      }),
    ),

    // Estado del SaaS (Sincronizado vía Webhooks de Polar.sh)
    onboardingComplete: v.boolean(),
    plan: v.union(v.literal("free"), v.literal("premium")),
    polarCustomerId: v.optional(v.string()),
    polarSubscriptionId: v.optional(v.string()),
    coachCrisisSnoozedUntil: v.optional(v.number()),
    appearanceTheme: v.optional(
      v.union(v.literal("light"), v.literal("tinta")),
    ),
    accentPreset: v.optional(
      v.union(v.literal("moss"), v.literal("steel"), v.literal("clay")),
    ),
    appIconVariant: v.optional(v.union(v.literal("light"), v.literal("dark"))),
    // Bloque 9 — preferencias de notificaciones (undefined = defaults en lectura).
    dailySummaryEnabled: v.optional(v.boolean()),
    cycleAlertsEnabled: v.optional(v.boolean()),
    createdAt: v.number(),
    accountStatus: v.optional(
      v.union(
        v.literal("active"),
        v.literal("suspended"),
        v.literal("under_review"),
      ),
    ),
  })
    .index("by_userId", ["userId"])
    .index("by_polarCustomerId", ["polarCustomerId"])
    .index("by_polarSubscriptionId", ["polarSubscriptionId"]),

  // Ciclos de Flujo de Caja reales (Payday-to-Payday)
  financialCycles: defineTable({
    profileId: v.id("profiles"),
    startDate: v.number(),
    endDate: v.number(), // Próxima fecha estimada de recarga
    status: v.union(v.literal("active"), v.literal("closed")),
    // v2.5: unified total, snapshot materializado de los incomeEvents del ciclo
    totalIncomeReceived: v.number(),
    // P1-10: boost de cobertura aplicado desde Ahorro del ciclo (coach crisis).
    coverageBoost: v.optional(
      v.object({
        needs: v.number(),
        wants: v.number(),
      }),
    ),
  }).index("by_profile_status", ["profileId", "status"]),

  // SOBRES CON SALDO VIVO: Resuelve la lentitud del dashboard O(1)
  envelopes: defineTable({
    profileId: v.id("profiles"),
    cycleId: v.id("financialCycles"),
    type: v.union(v.literal("needs"), v.literal("wants"), v.literal("savings")),
    allocatedAmount: v.number(),
    remainingAmount: v.number(), // Saldo vivo mutable modificado por gastos en tiempo real
    frozenUntil: v.optional(v.number()),
  })
    .index("by_cycle_type", ["cycleId", "type"])
    .index("by_profile_type", ["profileId", "type"]),

  // SUB-SOBRES DE AHORRO: Exclusivos para metas (Evita la microgestión en Necesidades/Gustos)
  subEnvelopes: defineTable({
    profileId: v.id("profiles"),
    parentEnvelopeType: v.literal("savings"), // Restringido estrictamente por diseño conductual
    label: v.string(), // e.g., "Fondo de Emergencia", "Viaje a Cusco"
    emoji: v.string(),
    currentAmount: v.number(),
    targetAmount: v.optional(v.number()),
    isSystemDefault: v.boolean(), // true para el Fondo de Emergencia mandatorio del sistema
  }).index("by_profile", ["profileId"]),

  // COMPROMISOS FIJOS: Gastos recurrentes del calendario del usuario (alquiler día 5,
  // Netflix día 18, etc.). NO se descuentan del ingreso antes del 50/30/20; el motor
  // de cobertura P1-1 evalúa si los sobres ya asignados los financian. El mecanismo
  // para reservar dinero antes de repartir es `heldCents` en el `incomeEvent`.
  // v2.5: el modelo es dueDay puro (día del mes, Lima). El campo "frequency"
  // viejo (first_payday / second_payday / every_payday) se eliminó porque
  // el frame del onboarding muestra "Cada día N", no el modelo de quincenas.
  fixedCommitments: defineTable({
    profileId: v.id("profiles"),
    name: v.string(),
    amount: v.number(),
    envelope: v.union(v.literal("needs"), v.literal("wants")),
    // v2.5: día del mes (Lima) en que se descuenta el compromiso. 1-31.
    dueDay: v.number(),
    // P1-1: cobertura persistida cuando los incomeEvents del ciclo lo financian.
    coveredAt: v.optional(v.number()),
    coveredBy: v.optional(v.array(v.id("incomeEvents"))),
    // P1-10: pospuesto solo para el ciclo activo (coach crisis).
    postponedForCycleId: v.optional(v.id("financialCycles")),
    // Concrete next payment due date (Lima midnight). Recurring rule stays in dueDay.
    nextDueAt: v.optional(v.number()),
    // Seguimiento de pago confirmado por el usuario (por ciclo). No mueve sobres.
    paidAt: v.optional(v.number()),
    paidForCycleId: v.optional(v.id("financialCycles")),
  })
    .index("by_profileId", ["profileId"])
    .index("by_profile_dueDay", ["profileId", "dueDay"]),

  // HISTORIAL DE GASTOS: Vinculado directamente a su ciclo dinámico de flujo
  expenses: defineTable({
    profileId: v.id("profiles"),
    cycleId: v.id("financialCycles"),
    envelopeId: v.id("envelopes"),
    subEnvelopeId: v.optional(v.id("subEnvelopes")), // Solo si afecta un fondo de ahorro
    amount: v.number(),
    description: v.string(),
    timestamp: v.number(),
    // P3-5: trazabilidad mínima de edición; _creationTime cubre creación.
    updatedAt: v.optional(v.number()),
  })
    .index("by_cycle_envelope_time", ["cycleId", "envelopeId", "timestamp"])
    .index("by_profile_time", ["profileId", "timestamp"]),

  // COACH DE IA PROACTIVO: Interacciones interactivas de un click (Opción 2)
  coachInteractions: defineTable({
    profileId: v.id("profiles"),
    cycleId: v.id("financialCycles"),
    triggerEvent: v.string(), // e.g., "WANTS_OVERFLOW_60", "STREAK_AT_RISK"
    initialNudge: v.string(), // Texto que expone el problema en el Dashboard
    options: v.array(
      v.object({
        id: v.string(), // e.g., "apply_rescue", "freeze_wants", "ignore"
        label: v.string(), // e.g., "Activar Modo Rescate"
      }),
    ),
    selectedOptionId: v.optional(v.string()), // Almacena la decisión del usuario
    rescueSuggestion: v.optional(
      v.object({
        transfer: v.number(),
        projectedDeficit: v.number(),
      }),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("resolved"),
      v.literal("applied"),
    ),
    createdAt: v.number(),
  }).index("by_profile_status", ["profileId", "status"]),

  // SISTEMA DE RACHAS: Soporta buffers para evitar el efecto "What the Hell"
  streaks: defineTable({
    profileId: v.id("profiles"),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastEvaluatedCycleId: v.optional(v.id("financialCycles")),
  }).index("by_profileId", ["profileId"]),

  // HISTORIAL DE CUMPLIMIENTO DE CICLOS: Desglosa si entró en zona de advertencia
  cycleHistory: defineTable({
    profileId: v.id("profiles"),
    cycleId: v.id("financialCycles"),
    status: v.union(
      v.literal("compliant"),
      v.literal("warning"),
      v.literal("failed"),
    ), // "warning" actua como zona de amortiguación
    evaluatedAt: v.number(),
    wantsWithinBudget: v.boolean(),
    allCommitmentsCovered: v.boolean(),
  })
    .index("by_profile_cycle", ["profileId", "cycleId"])
    .index("by_profileId", ["profileId"]),

  // v2.5: unified income event log. Replaces the implicit "salary vs cachuelo"
  // distinction that lived in financialCycles.baseIncomeReceived +
  // adHocIncomes in v2.0.
  incomeEvents: defineTable({
    profileId: v.id("profiles"),
    cycleId: v.id("financialCycles"),
    amount: v.number(), // integer cents, > 0
    source: v.union(
      v.literal("payroll"),
      v.literal("freelance"),
      v.literal("business"),
      v.literal("gift"),
      v.literal("refund"),
      v.literal("investment"),
      v.literal("other"),
    ),
    description: v.string(), // always required
    occurredAt: v.number(), // timestamp, can be retroactive
    distributionApplied: v.object({
      needs: v.number(),
      wants: v.number(),
      savings: v.number(),
    }),
    incomeKind: v.optional(
      v.union(v.literal("habitual"), v.literal("extraordinary")),
    ),
    extraordinaryType: v.optional(
      v.union(
        v.literal("gratification_july"),
        v.literal("gratification_december"),
        v.literal("cts"),
        v.literal("corporate_bonus"),
        v.literal("profit_sharing"),
        v.literal("custom"),
      ),
    ),
    extraordinaryLabel: v.optional(v.string()),
    distributionPolicy: v.optional(
      v.union(v.literal("profile_default"), v.literal("all_to_savings")),
    ),
    // P3-4: optional hold before 50/30/20. Integer cents, 0..amount.
    // distributable = amount - heldCents. totalIncomeReceived stays gross (sum of amount).
    heldCents: v.optional(v.number()),
    // P3-5: trazabilidad mínima de edición; _creationTime cubre creación.
    updatedAt: v.optional(v.number()),
  })
    .index("by_cycle", ["cycleId"])
    .index("by_profile_time", ["profileId", "occurredAt"]),

  surplusContributions: defineTable({
    profileId: v.id("profiles"),
    cycleId: v.id("financialCycles"),
    fromEnvelope: v.union(
      v.literal("needs"),
      v.literal("wants"),
      v.literal("extraordinary"),
    ),
    amount: v.number(),
    subEnvelopeId: v.id("subEnvelopes"),
    createdAt: v.number(),
  }).index("by_cycle", ["cycleId"]),

  emailSendLog: defineTable({
    email: v.string(),
    kind: v.union(v.literal("verification"), v.literal("password_reset")),
    sentAt: v.number(),
  }).index("by_email_kind", ["email", "kind"]),

  accountReviewFlags: defineTable({
    profileId: v.id("profiles"),
    reason: v.union(
      v.literal("content"),
      v.literal("email"),
      v.literal("manual"),
      v.literal("volume"),
    ),
    severity: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
    ),
    snippet: v.optional(v.string()),
    status: v.union(
      v.literal("open"),
      v.literal("dismissed"),
      v.literal("actioned"),
    ),
    createdAt: v.number(),
  }).index("by_status", ["status", "createdAt"]),
};

const schema = defineSchema(appTables);

export default schema;

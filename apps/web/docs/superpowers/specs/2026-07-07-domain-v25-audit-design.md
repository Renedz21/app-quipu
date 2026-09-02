# Quipu v2.5 — Auditoría de Arquitectura de Dominio

**Fecha:** 2026-07-07
**Estado:** Borrador para review del usuario
**Owner:** Equipo Quipu (auditoría a cargo del agente)
**Reemplaza:** ninguna — **no es una migración todavía**, es el diseño del modelo de dominio destino

---

## 1. Filosofía del producto

### 1.1 Tagline operativo

> Quipu convierte ingresos reales en control financiero concreto, sin pedirte que declares un sueldo.

### 1.2 Lo que Quipu SÍ hace

- Registra ingresos que realmente ocurrieron.
- Organiza los ingresos en ciclos (fijos, variables, mixtos). El ciclo no se ata a un día de pago: para `fixed`/`mixed` sigue el calendario del ingreso predecible; para `variable` sigue un horizonte (15 o 30 días) que se renueva con cada nuevo ingreso.
- Distribuye automáticamente los ingresos entre tres sobres (Necesidades, Gustos, Ahorro) cuando entran al ciclo. Para `fixed`/`mixed` esto ocurre típicamente al inicio del ciclo, con el primer ingreso. Para `variable` puede ocurrir múltiples veces dentro de un mismo ciclo, con cada `incomeEvent` que llegue.
- Hace seguimiento del saldo vivo de cada sobre.
- Registra gastos contra el sobre correspondiente.
- Modela compromisos fijos (alquiler, servicios, deudas) con su día de vencimiento en el calendario, y hace visible su cobertura sin descontarlos automáticamente del ingreso.
- Muestra el estado actual de cada sobre y la disponibilidad del ciclo (referencia, no regla).
- Sugiere acciones del coach cuando un sobre va a quedar en rojo antes del cierre, sin aplicar cambios sin confirmación.
- Mantiene racha de cumplimiento por ciclo (cumplido, advertencia, fallido) con un buffer para evitar el efecto "What the Hell".

### 1.3 Lo que Quipu NO hace

- No pregunta cuánto gana el usuario ni presupone un sueldo.
- No prescribe cuánto gastar por día (la disponibilidad es una referencia, no una regla).
- No hace banca, no custodia dinero, no es billetera.
- No se conecta a cuentas bancarias.
- No categoriza gastos con listas infinitas (las categorías son los 3 sobres + sub-sobres de ahorro).
- No bloquea gastos por exceder el sobre (registra siempre, evalúa al cierre).
- No limita el número de gastos en plan Free.
- No aplica automáticamente transferencias entre sobres (el usuario confirma siempre).
- No congela sobres como castigo (solo si el usuario lo pide explícitamente).
- No infiere el `incomeModel` (se declara en el onboarding; se puede cambiar después en settings).
- No soporta ingresos diferidos (60-90 días) en esta versión.

### 1.4 Target

> Trabajadores en planilla, freelancers, independientes y usuarios con ingresos mixtos o variables puros en Perú. El producto está especialmente diseñado para contextos donde el dinero no entra de forma perfectamente predecible.

### 1.5 Disponibilidad del ciclo (matiz filosófico)

La "disponibilidad" se calcula como `saldoRestante / díasRestantesDelCiclo`, pero **no es una prescripción**: Quipu no dice "hoy solo podés gastar S/40". Es una **referencia** que muestra el estado del sobre: "si mantenés este ritmo, vas a llegar al cierre sin problemas". El usuario puede gastar S/100 hoy y S/0 mañana si quiere; el indicador se actualiza para reflejar el nuevo ritmo.

**Regla resumen:**

> Quipu no controla tus decisiones; hace visibles las consecuencias de ellas en tiempo real.

### 1.6 Regla de diseño: facts over derivations

> El dominio de Quipu debe almacenar únicamente hechos (facts) y no decisiones derivables. Si una pieza de información puede inferirse de otra de forma determinista (e.g., `cycleStrategy` desde `incomeModel`), no debería persistirse. En cambio, si representa el resultado histórico de una operación o preserva verdad para reversibilidad (e.g., `distributionApplied`, `totalIncomeReceived`), sí tiene sentido almacenarla.

Esta regla es el criterio rector para todas las decisiones de modelado de aquí en adelante.

---

## 2. Mapa del dominio actual (estado del código en `chore/quipu-2.0`)

10 tablas de Quipu + tablas administradas por el componente Better Auth (no auditadas).

| # | Tabla | Propósito | Referencias |
|---|---|---|---|
| 1 | `profiles` | "Dueño" del producto. 1 usuario Better Auth → 0 o 1 perfil | todas |
| 2 | `financialCycles` | Período financiero. Status: active/closed. Hoy se siembra en payday (modelo actual); en v2.5 se siembra cuando corresponde según `incomeModel` del perfil (payday para `fixed`/`mixed`, horizonte para `variable`) | paydayEngine, expenses, coach |
| 3 | `envelopes` | 3 sobres vivos del ciclo (needs/wants/savings) | paydayEngine, coach, expenses |
| 4 | `subEnvelopes` | Sub-sobres del sobre de Ahorro (metas). Default: Fondo de Emergencia | paydayEngine, expenses |
| 5 | `fixedCommitments` | Gastos fijos recurrentes, descontados del neto | paydayEngine, fixedCommitments |
| 6 | `expenses` | Cada gasto contra un sobre | expenses |
| 7 | `coachInteractions` | Alertas del coach, pending/resolved | expenses (crea), coachEngine |
| 8 | `streaks` | Racha de cumplimiento por perfil | profiles, paydayEngine |
| 9 | `cycleHistory` | Historial de cumplimiento por ciclo | paydayEngine |
| 10 | `adHocIncomes` | Ingresos "extra" a un ciclo activo | paydayEngine |

**Relaciones clave:**

```
profiles (1) ── (N) financialCycles
financialCycles (1) ── (3) envelopes
financialCycles (1) ── (N) adHocIncomes
financialCycles (1) ── (N) expenses
financialCycles (1) ── (N) coachInteractions
envelopes (1) ── (N) subEnvelopes [solo savings]
envelopes (1) ── (N) expenses
```

**Redundancia notable:** `profileId` está en casi todas las tablas aunque sea derivable por `cycleId` o `envelopeId`. No es un problema funcional, es una decisión de indexación que se mantiene.

---

## 3. Auditoría campo por campo

### 3.1 `profiles`

| Campo | ¿Sigue? | Decisión | Razón |
|---|---|---|---|
| `userId` | sí | sin cambios | FK lógica a Better Auth |
| `name` | sí | sin cambios | requerido |
| `country` | sí | sin cambios | default "Perú" en UI |
| `currencyCode` | sí | sin cambios | "PEN" |
| `currencySymbol` | sí | sin cambios | "S/" |
| `workerType` | **sale** | reemplazado por `incomeModel` | El producto no modela trabajadores, modela cómo entra el dinero. Un usuario puede ser planilla + freelance simultáneamente; `workerType` no lo expresa. |
| `payFrequency` | sí, **opcional** | cambia a `v.optional(...)` | Solo aplica si `incomeModel ∈ {"fixed", "mixed"}`. Para `variable`, no existe el concepto. |
| `paydays` | sí, **opcional** | cambia a `v.optional(v.array(...))` | Misma razón. |
| `allocationNeeds` | sí | sin cambios | 0-100, suma 100 con los otros 2 |
| `allocationWants` | sí | sin cambios | idem |
| `allocationSavings` | sí | sin cambios | idem |
| `onboardingComplete` | sí | sin cambios | flag de idempotencia |
| `plan` | sí | sin cambios semánticos | "free" / "premium"; semántica cambia (Premium = automatizar, no = +gastos) pero eso se documenta en módulo aparte, no en este spec |
| `polarCustomerId`, `polarSubscriptionId`, `createdAt` | sí | sin cambios | integraciones y auditoría |

**Entran:**
- `incomeModel: v.union(v.literal("fixed"), v.literal("variable"), v.literal("mixed"))` — requerido.

**Regla de validación en backend (`createProfile`):**
- Si `incomeModel === "fixed"` o `"mixed"`: `payFrequency` y `paydays` son obligatorios.
- Si `incomeModel === "variable"`: `payFrequency` y `paydays` deben ser `undefined` / `[]`.

**Índices:** se mantienen `by_userId`, `by_polarCustomerId`, `by_polarSubscriptionId`. Sin cambios.

---

### 3.2 `financialCycles`

| Campo | ¿Sigue? | Decisión | Razón |
|---|---|---|---|
| `profileId` | sí | sin cambios | FK |
| `cycleStrategy` | **NO entra** | derivable desde `profile.incomeModel` | Regla facts-over-derivations. `fixed`/`mixed` → `payday`; `variable` → `calendar`. Modelar ambos crea estados imposibles (`incomeModel=variable` + `cycleStrategy=payday` es inválido y tendríamos que prevenirlo). |
| `startDate` | sí | sin cambios | timestamp |
| `endDate` | sí | sin cambios | timestamp, fórmula cambia (ver §4) |
| `status` | sí | sin cambios | "active" / "closed" |
| `baseIncomeReceived` | **sale** | ya no existe en la realidad | El "sueldo" no es un fact: es un subconjunto de `incomeEvents` con `source === "payroll"`. Si lo necesitás, agregás eventos con `source: "payroll"`. |
| `extraordinaryIncomeReceived` | **sale** | ya no existe | Idem. La separación "sueldo vs cachuelo" es el anti-patrón que estamos eliminando. |
| `totalPeriodIncome` | **cambia de nombre** | renombrar a `totalIncomeReceived` | Sigue siendo un agregado materializado, pero ya no sugiere "período" (que era el framing del payday). |

**Entran:** ninguno.

**Salen:** `cycleStrategy` (nunca entró), `baseIncomeReceived`, `extraordinaryIncomeReceived`, `totalPeriodIncome` (renombrado).

**Mantener `totalIncomeReceived` como campo cacheado:**
- Razón: Convex es bueno con estado materializado. "¿Cuánto entró en el ciclo N?" debería ser O(1) en el dashboard, no una agregación sobre N incomeEvents.
- Actualización: atómica, en la misma transaction que inserta un `incomeEvent` y al cerrar un ciclo (no se reabre, ver §4.2).
- No viola facts-over-derivations: es un snapshot del total en el momento del cierre, no una derivación lógica.

**Índices:** `by_profile_status` se mantiene.

---

### 3.3 `incomeEvents` (nueva, reemplaza `adHocIncomes`)

**Razón de ser:** unificar "sueldo" y "cachuelo" bajo un solo concepto: evento financiero. Todos los ingresos son eventos; los distinguís por `source`, no por "es el principal".

| Campo | Tipo | Notas |
|---|---|---|
| `profileId` | `Id<"profiles">` | FK redundante con `cycleId` (consistente con el resto del schema) |
| `cycleId` | `Id<"financialCycles">` | FK, apunta al ciclo al que se asigna el evento |
| `amount` | `number` | céntimos enteros > 0 |
| `source` | `"payroll" \| "freelance" \| "business" \| "gift" \| "refund" \| "investment" \| "other"` | `payroll` no `salary` (evita la palabra "sueldo"). `other` como escape hatch; con telemetría se ve si el 40% lo usa y se agregan tipos nuevos. |
| `description` | `string` | texto libre, **siempre requerido**. YAGNI: no discriminar entre `other` y el resto. |
| `occurredAt` | `number` | timestamp; puede ser retroactivo si el usuario registra tarde |
| `distributionApplied` | `{ needs, wants, savings }` | céntimos exactos del reparto aplicado. Verdad histórica: nunca se recalcula. Si el usuario cambia 50/30/20 → 60/20/20, los eventos viejos conservan su split original. |

**Índices:**
- `by_cycle` (sobre `cycleId`)
- `by_profile_time` (sobre `["profileId", "occurredAt"]`)

**Reglas:**
- Al crear un `incomeEvent` que pertenece al ciclo activo, se reparte con las `allocations` **actuales** del perfil y se guarda el split en `distributionApplied`.
- Al crear el **primer** evento de un ciclo nuevo (cierre del anterior + apertura), se reparten con las allocations al momento del cierre. No se reabre el ciclo cerrado.
- `description` requerido siempre. Si en el futuro queremos hacerlo opcional para `payroll`, lo agregamos.

---

### 3.4 `envelopes`

| Campo | ¿Sigue? | Decisión | Razón |
|---|---|---|---|
| `profileId` | sí | sin cambios | Útil para queries cross-cycle ("todos mis sobres"). YAGNI sacarlo. |
| `cycleId` | sí | sin cambios | FK |
| `type` | sí | sin cambios | "needs" / "wants" / "savings" |
| `allocatedAmount` | sí | sin cambios | céntimos |
| `remainingAmount` | sí | sin cambios | céntimos, puede ser negativo |
| `frozenUntil` | sí | sin cambios (semántica se discute en §6.4) | timestamp; congelar es decisión del usuario, no castigo automático |

**Índices:** se mantienen.

---

### 3.5 `subEnvelopes`

Sin cambios. Sigue siendo un sub-sobre del sobre `savings` con `isSystemDefault: true` para el Fondo de Emergencia.

---

### 3.6 `fixedCommitments`

**Cambio principal:** se reorienta el modelo desde "frecuencia de descuento" a "fecha de vencimiento en el calendario".

| Campo | ¿Sigue? | Decisión | Razón |
|---|---|---|---|
| `profileId` | sí | sin cambios | FK |
| `name` | sí | sin cambios | "Alquiler", "Internet" |
| `amount` | sí | sin cambios | céntimos |
| `frequency` | **sale** | reemplazado por `dueDay` | El commitment existe en el calendario, no en el ciclo. El motor decide cómo financiarlo. |
| `envelope` | sí | sin cambios | "needs" / "wants" |
| `dueDay` | **entra** | `number` (1-31) | Día del mes en que vence el compromiso en Lima. El motor decide en qué momento se descuenta según `incomeModel` del perfil. |

**Semántica de `dueDay` (intención conductual):**

El compromiso vive en el calendario, no en el ciclo. Su `dueDay` no se modifica con el ciclo ni con los ingresos; es una fecha del mes. El motor de Quipu **no descuenta automáticamente** el compromiso del próximo ingreso. En su lugar:

- `fixed` / `mixed`: el motor **recomienda** que el siguiente ingreso predecible (próximo payday) reserve suficiente para cubrir el commitment antes de `dueDay`. La recomendación se muestra como información, no como acción aplicada.
- `variable` / `mixed` (parte variable): el motor lleva un "objetivo de cobertura" por commitment pendiente. Cada `incomeEvent` que entra sugiere (no aplica) cuánto de ese evento podría destinarse a cubrir commitments cuyo `dueDay` se aproxima. El usuario confirma qué commitments se cubren con cada evento.

**Diferencia clave con el modelo anterior:** Quipu no "descuenta" los compromisos del neto antes de repartir. Los compromisos se modelan como objetivos que el motor ayuda a visualizar y planificar, no como descuentos automáticos. Esto es coherente con la regla "facts over derivations" y con la filosofía "Quipu no controla tus decisiones; hace visibles las consecuencias".

**Estado de cobertura:** **no se persiste** (regla facts-over-derivations). Se calcula on-the-fly: "¿cuánto de este commitment ya fue marcado como cubierto por incomeEvents del ciclo actual?". Si alcanzó, está cubierto. No se permite doble conteo.

**Índices:** `by_profileId` se mantiene. Posible nuevo índice: `by_profile_dueDay` para queries de "próximos vencimientos" en el dashboard. Decidir en §6.

**Posible rename:** `fixedCommitments` → `recurringObligations` o `commitments`. Decisión abierta §9.

---

### 3.7 `expenses`

| Campo | ¿Sigue? | Decisión | Razón |
|---|---|---|---|
| `profileId` | sí | sin cambios | |
| `cycleId` | sí | sin cambios | |
| `envelopeId` | sí | sin cambios | |
| `subEnvelopeId` | sí | sin cambios | opcional |
| `amount` | sí | sin cambios | |
| `description` | sí | sin cambios | |
| `timestamp` | sí | sin cambios | |
| `origin` | **diferido** | no se agrega en v2.5 | Mencionado como follow-up para Premium (automatización). No urge. |

**Cambio importante en la mutation `registerExpense`:** eliminar el `FREE_PLAN_MONTHLY_LIMIT = 20` que está en `convex/expenses.ts:5`. Plan Free es ilimitado y manual. El Premium se justifica por automatizar (origen automático de gastos), no por más registros.

**Índices:** se mantienen.

---

### 3.8 `coachInteractions`

Sin cambios en el schema. Se discute el comportamiento del coach en §6.4 (la "nueva filosofía" implica cambios en `resolveNudgeAction` y `computeRescueTransfer`, no en la tabla).

---

### 3.9 `streaks`, `cycleHistory`

Sin cambios.

---

### 3.10 `adHocIncomes` → `incomeEvents`

**Sale `adHocIncomes`. Entra `incomeEvents`.** Migración: 1:1.

| Campo en `adHocIncomes` | → Campo en `incomeEvents` |
|---|---|
| `profileId` | `profileId` |
| `cycleId` | `cycleId` |
| `amount` | `amount` |
| `description` | `description` |
| `timestamp` | `occurredAt` |
| `split` | `distributionApplied` |
| — | `source: "other"` (default en migración) |

**Decisión de migración (confirmada por el usuario):** se preserva toda la información. Cada `adHocIncome` se convierte en un `incomeEvent` con `source: "other"` y el `description` original (e.g., "Cachuelo" → description: "Cachuelo", source: "other"). El `split` se copia a `distributionApplied`. No perdemos ningún dato.

**Nota:** la pérdida conceptual es que esos `incomeEvents` migrados con `source: "other"` no podrán distinguirse de un `other` real. Es un trade-off aceptable para v2.5 (datos de demo, no producción).

---

## 4. Modelo propuesto (schema v2.5)

### 4.1 `profiles` (nuevo)

```ts
profiles: defineTable({
  userId: v.string(),
  name: v.string(),
  country: v.string(),
  currencyCode: v.string(),
  currencySymbol: v.string(),

  // Modelo de organización de ciclos (reemplaza workerType)
  incomeModel: v.union(
    v.literal("fixed"),
    v.literal("variable"),
    v.literal("mixed"),
  ),

  // Configuración del ingreso fijo (si incomeModel es "fixed" o "mixed")
  payFrequency: v.optional(
    v.union(v.literal("monthly"), v.literal("biweekly")),
  ),
  paydays: v.optional(v.array(v.number())),

  // Distribución del pre-compromiso
  allocationNeeds: v.number(),    // default 50
  allocationWants: v.number(),    // default 30
  allocationSavings: v.number(),  // default 20

  // SaaS
  onboardingComplete: v.boolean(),
  plan: v.union(v.literal("free"), v.literal("premium")),
  polarCustomerId: v.optional(v.string()),
  polarSubscriptionId: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_polarCustomerId", ["polarCustomerId"])
  .index("by_polarSubscriptionId", ["polarSubscriptionId"]),
```

### 4.2 `financialCycles` (nuevo)

```ts
financialCycles: defineTable({
  profileId: v.id("profiles"),
  startDate: v.number(),
  endDate: v.number(),
  status: v.union(v.literal("active"), v.literal("closed")),

  // Snapshot del total al cierre. Se actualiza atómicamente con cada incomeEvent.
  totalIncomeReceived: v.number(), // céntimos
})
  .index("by_profile_status", ["profileId", "status"]),
```

**Cálculo de `endDate` (en código, no en schema):**
- `incomeModel ∈ {fixed, mixed}`: `endDate = startDate + CYCLE_DAYS[payFrequency] * MS_PER_DAY`
- `incomeModel = variable`: `endDate = startDate + horizonDays * MS_PER_DAY` (15 o 30, configurable en el perfil — futuro follow-up; por ahora constante en `horizonDays: 15`)

**Nota:** `horizonDays` no entra al schema en v2.5. Es constante del motor. Se hace configurable en v3+ (ver §9).

### 4.3 `incomeEvents` (nuevo, reemplaza `adHocIncomes`)

```ts
incomeEvents: defineTable({
  profileId: v.id("profiles"),
  cycleId: v.id("financialCycles"),
  amount: v.number(), // céntimos enteros > 0

  // Qué tipo de ingreso ocurrió (ortogonal a incomeModel del perfil)
  source: v.union(
    v.literal("payroll"),
    v.literal("freelance"),
    v.literal("business"),
    v.literal("gift"),
    v.literal("refund"),
    v.literal("investment"),
    v.literal("other"),
  ),

  description: v.string(), // requerido siempre

  occurredAt: v.number(), // timestamp, puede ser retroactivo

  // Verdad histórica del reparto aplicado al momento del evento
  distributionApplied: v.object({
    needs: v.number(),
    wants: v.number(),
    savings: v.number(),
  }),
})
  .index("by_cycle", ["cycleId"])
  .index("by_profile_time", ["profileId", "occurredAt"]),
```

### 4.4 `envelopes`, `subEnvelopes`, `coachInteractions`, `streaks`, `cycleHistory`, `expenses`

Sin cambios de schema. Detalles en §3.

### 4.5 `fixedCommitments` (nuevo)

```ts
fixedCommitments: defineTable({
  profileId: v.id("profiles"),
  name: v.string(),
  amount: v.number(), // céntimos
  envelope: v.union(v.literal("needs"), v.literal("wants")),

  // Día del mes (Lima) en que vence el compromiso
  dueDay: v.number(), // 1-31
})
  .index("by_profileId", ["profileId"])
  .index("by_profile_dueDay", ["profileId", "dueDay"]), // nuevo, para "próximos vencimientos"
```

**Sin `frequency`.** La periodicidad es mensual implícita (todo commitment vence el mismo día cada mes). Si en el futuro alguien quiere "solo en meses pares" o "cada 2 meses", se agrega `cadence` como follow-up (§9).

---

## 5. Plan de migración (widen → migrate → narrow)

Siguiendo la guía de Convex migrations, en 3 fases con deploy entre cada una.

### Fase 1: WIDEN (deploy #1)

Agregar los nuevos campos y la nueva tabla `incomeEvents` sin tocar nada existente. **El código viejo sigue funcionando.**

1. En `convex/schema.ts`:
   - `profiles`: agregar `incomeModel: v.optional(v.union(...))`. Hacer `payFrequency` y `paydays` opcionales (mantener requeridos en la signature de `createProfile` hasta fase 2).
   - `financialCycles`: agregar `totalIncomeReceived: v.optional(v.number())`. Mantener `baseIncomeReceived`, `extraordinaryIncomeReceived`, `totalPeriodIncome` (sin defaults — son los existentes).
   - Crear tabla `incomeEvents` (vacía).
   - `fixedCommitments`: agregar `dueDay: v.optional(v.number())`. Mantener `frequency` (sin default).
   - Mantener tabla `adHocIncomes` intacta.
2. En código de mutaciones: nada cambia. El sistema sigue funcionando exactamente como antes.
3. `npx convex dev` regenera tipos. Commit.

**Resultado:** schema v2.5-pre. Código sigue en v2.0.

### Fase 2: MIGRATE (deploy #2)

Poblar los nuevos campos con datos derivados de los viejos. La nueva tabla `incomeEvents` se llena desde `adHocIncomes`. **Ambas tablas coexisten.**

1. **Backfill de `profiles`:**
   - Para cada perfil existente con `workerType: "dependent"`: set `incomeModel = "fixed"`. Asignar `payFrequency` y `paydays` que ya tiene.
   - Para cada perfil con `workerType: "independent"`: set `incomeModel = "variable"`. Set `payFrequency = undefined`, `paydays = undefined` (requiere cambiar a `v.optional` en schema, lo que ya pasó en fase 1).
   - Si hay perfiles con `payFrequency: "biweekly"` o `"monthly"`, mantener. No inferir nada raro.
2. **Backfill de `financialCycles`:**
   - Para cada ciclo: `totalIncomeReceived = baseIncomeReceived + extraordinaryIncomeReceived`.
3. **Backfill de `incomeEvents` desde `adHocIncomes`:**
   - Por cada `adHocIncome`:
     ```ts
     await ctx.db.insert("incomeEvents", {
       profileId: income.profileId,
       cycleId: income.cycleId,
       amount: income.amount,
       source: "other", // migración conservadora
       description: income.description,
       occurredAt: income.timestamp,
       distributionApplied: income.split,
     });
     ```
   - Esto es idempotente si lleva un flag en la tabla adHocIncomes (e.g., `migratedToIncomeEvents: true`). O se hace una sola vez con un script.
4. **Backfill de `fixedCommitments`:**
   - Para cada commitment con `frequency: "monthly"`: set `dueDay = 1` (default razonable; el usuario lo ajustará después).
   - Para `frequency: "first_payday"` o `"second_payday"`: derivar `dueDay` del `paydays` del perfil. Si el perfil migrado es `variable` y no tiene `paydays`, default `dueDay = 1`.
   - Para `frequency: "every_payday"`: tomar el día 1 del `paydays` como `dueDay`. Si no hay `paydays`, default `dueDay = 1`.
   - Esto es una migración con pérdida: si el usuario tenía `every_payday` (cuenta en ambos payday), queda como día 1, no se replica. **Trade-off documentado, se le pregunta al usuario después si quiere ajustar.**
5. `npx convex dev` regenera tipos. Commit.

**Resultado:** schema v2.5-pre con datos poblados. Código sigue en v2.0 (no usa los nuevos campos todavía).

### Fase 3: NARROW (deploy #3)

Cambiar el código para usar el nuevo modelo. Una vez estable, eliminar lo viejo.

1. **Actualizar `createProfile`:**
   - Aceptar `incomeModel` en vez de `workerType`.
   - Validar que `payFrequency`/`paydays` están presentes si `incomeModel ∈ {fixed, mixed}`.
   - Remover `workerType` del insert.
2. **Actualizar `processPayday` → renombrar a `processIncomeEvent` (o crear `createIncomeEvent` que también cubre el "primer evento del ciclo"):**
   - Una sola mutation `createIncomeEvent(input: { amount, source, description, occurredAt })` que:
     - **Resolución del ciclo:** busca el ciclo activo del perfil. Si `occurredAt` cae dentro del rango `[startDate, endDate)` del ciclo activo, asigna el evento a ese ciclo. Si no, busca el ciclo cuyo rango lo contenga (puede ser uno cerrado retroactivamente, en cuyo caso lo "reabre" como activo y ajusta el cierre). Si no hay ninguno, crea un ciclo nuevo con `startDate = occurredAt`.
     - **Cierre/apertura:** si había un ciclo activo distinto al resolved, ciérralo, evalúa racha, crea el nuevo ciclo si es necesario.
     - **Cálculo del split:** con las `allocations` del perfil al momento del evento, calcular `distributionApplied` (largest-remainder, ya en `budgetMath.ts`).
     - **Insert del evento:** crear el `incomeEvent` con el split guardado.
     - **Actualizar sobres:** sumar el split a los 3 sobres del ciclo resolved.
     - **Actualizar snapshot:** `totalIncomeReceived += amount` en el ciclo resolved.
   - **Cubre** lo que hacía `processPayday` + `registerAdHocIncome` + `deleteAdHocIncome`.
3. **Reescribir `sumApplicableCommitments` (en `budgetMath.ts`):**
   - En vez de "¿cuánto aplica a este ciclo según frecuencia?", pregunta "¿este commitment ya está cubierto en este ciclo?".
   - Calcula `coveredAmount = sum(incomeEvents.filter(c.commitmentId === X && c.cycleId === Y))` (futuro, cuando se implemente la cascada).
   - En v2.5 inicial: el motor **descuenta los commitments del primer evento del ciclo** (o del evento que el usuario marque). Lógica simple, suficiente para el primer release.
4. **Eliminar `adHocIncomes`** del schema y de las referencias en código.
5. **Eliminar `baseIncomeReceived`, `extraordinaryIncomeReceived`, `totalPeriodIncome`** de `financialCycles`. Queda solo `totalIncomeReceived`.
6. **Eliminar `frequency`** de `fixedCommitments`. Queda solo `dueDay`.
7. **Eliminar `workerType`** de `profiles`.
8. **Eliminar `FREE_PLAN_MONTHLY_LIMIT`** de `expenses.ts`. Reemplazar el mensaje de error en `registerExpense` con un mensaje que ya no aplica (o remover el bloque).
9. **Migración de errores:** todas las mutaciones lanzan `ConvexError({ code, message })` con códigos del enum `ErrorCode`. Esto es transversal, no específico de v2.5, pero se aprovecha este PR.
10. `npx convex dev` regenera tipos. Commit. Smoke test manual de los flujos principales (onboarding, payday, expense, coach).

**Resultado:** schema v2.5 puro. Código en v2.5.

### Riesgos de la migración

| Riesgo | Mitigación |
|---|---|
| Datos existentes de `adHocIncomes` se pierden en narrow | Backfill en fase 2. Verificar conteo antes de narrow. |
| `processIncomeEvent` rompe atomicidad si reordenamos inserts | Escribir tests E2E en fase 3 antes de narrow. |
| Usuarios con `workerType: "independent"` migrados a `incomeModel: "variable"` pero que tenían `payFrequency` set | El backfill setea `payFrequency = undefined` para "variable". El front no debe permitir editarlo. Validar en `createProfile`. |
| Compromisos con `frequency: "every_payday"` pierden semántica tras narrow | Documentar como trade-off; mostrar banner en la UI de commitments pidiendo al usuario revisar y ajustar `dueDay` después de la migración. |
| `createProfile` rompe para usuarios con perfil ya creado (idempotencia) | El código actual retorna `existing._id` sin revalidar. Después de fase 1, podemos relajarlo, pero el comportamiento sigue siendo el mismo: no recrear. |

---

## 6. Impacto en módulos existentes

Detalle de qué cambia (no de implementación, solo de comportamiento esperado) en cada módulo.

### 6.1 `modules/onboarding/` (cambia mucho)

- El paso 1 sigue capturando `name`.
- El paso 2 ya no pregunta `workerType`. Pregunta `incomeModel: fixed | variable | mixed`.
- El paso 3 (frecuencia/días de pago) **se muestra solo si `incomeModel ∈ {fixed, mixed}`**. Si `variable`, se salta al paso de horizonte.
- **Paso nuevo para `variable`:** "¿Cuál es tu horizonte financiero? 15 días / 30 días". Default 15.
- Paso 4 (ciclo financiero) cambia el copy según `incomeModel`:
  - `fixed` / `mixed`: "Tu ciclo {frecuency} de {N} días empieza hoy, {fecha}."
  - `variable`: "Tu horizonte de {N} días empieza hoy, {fecha}. Cada ingreso que registres se reparte automáticamente."
- Pasos 5-8 sin cambios estructurales.

**Nota:** el onboarding completo se reescribe en un spec aparte, **después** de estabilizar este. La auditoría de dominio es prerrequisito del spec de onboarding v2.5.

### 6.2 `modules/payday/` (cambia mucho, o se reemplaza)

- El concepto "día de pago" desaparece como primitivo. Se reemplaza por "registrar un ingreso".
- `processPayday` se reemplaza por `createIncomeEvent` (mutation unificada que cubre el "primer evento del ciclo" + "eventos a mitad de ciclo" + "reversión de eventos").
- La UI de payday (que es un "registrar ingreso") se reescribe para pedir `amount`, `source`, `description`, `occurredAt` (con opción de backdate hasta N días).
- El motor de cascada para `variable`/`mixed` se diseña aparte (ver §9 follow-ups).

### 6.3 `modules/expenses/` (cambia poco)

- `registerExpense` se simplifica: se elimina el bloque de `FREE_PLAN_MONTHLY_LIMIT`.
- El resto del flujo (registrar gasto, ver historial, eliminar) no cambia.
- La UI de "registrar gasto" no cambia.

### 6.4 `modules/coach/` (cambia mucho en comportamiento, schema igual)

- `resolveNudgeAction` con `optionId: "freeze_wants"`: ya no aplica `frozenUntil` automáticamente. Abre un flow de **doble confirmación**:
  1. El coach sugiere: "Tu Gustos va a quedar en -S/ 50 antes del cierre. Si querés, podés congelarlo 3 días para el ritmo. ¿Querés hacerlo?"
  2. Si confirma, aplica `frozenUntil = now + 3d`. Si no, no hace nada.
- `resolveNudgeAction` con `optionId: "suggest_rescue"`: ya no transfiere automáticamente. Devuelve `{ from: "savings", to: "wants", amount, projectedDeficit }` y abre flow de doble confirmación.
- `computeRescueTransfer` (en `budgetMath.ts`): cambia de "ejecuta" a "sugiere". La signature puede cambiar a `suggestRescueTransfer(savingsRemaining, wantsRemaining): { transfer, projectedDeficit }`.
- El trigger `WANTS_OVERFLOW_60` se mantiene, pero el copy del `initialNudge` cambia para reflejar la nueva semántica (sugerir, no supervisar).
- **Nuevo tipo de nudge para commitments:** el coach puede sugerir "tenés un compromiso que vence en 3 días (Alquiler, S/ 1,200) y tu Gustos+Necesidades no lo cubre con el ritmo actual. Querés reservar del próximo ingreso?". Esto refuerza la intención conductual de §3.6: los compromisos son objetivos visibles, no descuentos automáticos.

### 6.5 `modules/dashboard/` (cambia estructuralmente)

- El header "Disponible para hoy" cambia su cálculo: ya no es `presupuesto_diario` (no existe), sino `disponibilidad_del_ciclo = saldoRestante / díasRestantes`. Se muestra como referencia, no como regla.
- El banner de "Modo Rescate" cambia: ya no es "movimos S/ X automáticamente", es "tu Gustos va a quedar en rojo; querés cubrirlo con S/ X de tus ahorros?".
- El listado de compromisos muestra `dueDay` prominently (próximo vencimiento).
- La lista de incomeEvents reemplaza a la lista de adHocIncomes (UI similar, label "Ingresos del ciclo" en vez de "Ingresos extra").

---

## 7. Lo que NO cambia

- `envelopes`, `subEnvelopes` (schema).
- `streaks`, `cycleHistory` (schema y semántica).
- `coachInteractions` (schema; solo cambia la lógica de las mutations).
- `expenses` (schema; solo se elimina el FREE_PLAN_MONTHLY_LIMIT).
- La estructura de módulos: `app/`, `modules/`, `shared/`, `core/`, `convex/`, `auth/`.
- La regla "facts over derivations" no afecta a tablas donde no hay decisión que tomar.
- Better Auth y passkey (intactos; son del componente).
- Tokens de color de sobres (`--needs`/`--wants`/`--savings` en `app/globals.css`).
- Patrón "1 ruta por feature + state cliente para wizards".
- Sin `cacheComponents` (sigue desactivado hasta nuevo aviso).

---

## 8. Decisiones explícitas (registro)

| Decisión | Razón | Fecha |
|---|---|---|
| `workerType` sale; entra `incomeModel: fixed | variable | mixed` | Quipu modela cómo entra el dinero, no la condición laboral | 2026-07-07 |
| `payFrequency` y `paydays` opcionales; requeridos solo si `incomeModel ∈ {fixed, mixed}` | Para `variable` no existen fechas de pago | 2026-07-07 |
| `cycleStrategy` NO se persiste; se computa desde `incomeModel` | Facts over derivations. Evita estados imposibles. | 2026-07-07 |
| `baseIncomeReceived`, `extraordinaryIncomeReceived` salen; `totalPeriodIncome` se renombra a `totalIncomeReceived` | La separación "sueldo vs cachuelo" es el anti-patrón. `totalIncomeReceived` se mantiene como snapshot materializado. | 2026-07-07 |
| `adHocIncomes` se reemplaza por `incomeEvents` con `source: payroll | freelance | business | gift | refund | investment | other` | Unificar todos los ingresos bajo un solo concepto | 2026-07-07 |
| `distributionApplied` es verdad histórica, nunca se recalcula | Permite reversibilidad exacta de eventos aunque cambien las allocations | 2026-07-07 |
| `fixedCommitments.frequency` se reemplaza por `dueDay: number` (1-31) | Los commitments existen en el calendario, no en el ciclo | 2026-07-07 |
| Estado de cobertura de commitments se calcula on-the-fly, no se persiste | Facts over derivations | 2026-07-07 |
| `FREE_PLAN_MONTHLY_LIMIT = 20` se elimina | Plan Free es ilimitado y manual. Premium se justifica por automatización, no por más registros. | 2026-07-07 |
| Coach no aplica cambios sin confirmación; doble opt-in para freeze y rescue | Refuerza la filosofía "no controla, hace visibles consecuencias" | 2026-07-07 |
| Disponibilidad del ciclo es referencia, no regla | Distinción filosófica central | 2026-07-07 |

---

## 9. Decisiones abiertas / follow-ups (no bloquean v2.5)

Estas quedan para specs hijos. **No son parte del alcance de v2.5:**

1. **`horizonDays` configurable por perfil** (hoy constante en el motor: 15 días para `variable`).
2. **`origin: "manual" | "automatic"` en `expenses`** (Premium feature, automatización de gastos).
3. **`commitmentId` opcional en `incomeEvents`** para tracking explícito de "este evento cubrió este commitment". Por ahora se calcula por agregación.
4. **Rename `fixedCommitments` → `recurringObligations` o `commitments`**. El campo interno cambió, el nombre de la tabla podría modernizarse.
5. **Cadencia variable para commitments** (cada 2 meses, solo meses pares, etc.). Hoy todos son mensuales implícitos.
6. **Ingresos diferidos** (60-90 días, e.g., facturación a plazo). Out of scope.
7. **Multi-moneda**. Out of scope.
8. **Onboarding v2.5** (reescrito sobre el modelo nuevo). Spec aparte, después de este.
9. **Tests E2E de la migración**. Se pueden agregar en cualquier momento.
10. **Documentación de dominio en `docs/domain/`**. Glossary, decisiones de modelo, etc.

---

## 10. Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| La fase 1 (widen) introduce un campo opcional que código existente rompe al leer | Baja | Bajo | Tests existentes + smoke test en dev antes de deploy |
| El backfill de `adHocIncomes` → `incomeEvents` produce duplicados si se corre 2 veces | Media | Medio | Idempotencia con flag `migratedToIncomeEvents` en `adHocIncomes` (temporal, se borra en narrow) |
| `processIncomeEvent` reordenando inserts rompe atomicidad | Baja | Alto | Tests E2E exhaustivos en fase 3 antes de narrow |
| Usuarios con `workerType: "independent"` no entienden que su `payFrequency` desapareció | Alta | Bajo | Banner post-migración en `/settings`: "Revisá tu configuración: ya no usamos paydays para ingresos variables." |
| El motor de cascada para `variable`/`mixed` (cuándo se descuentan los commitments) no está bien especificado | Alta | Alto | §9 lo marca como follow-up. v2.5 inicial asume "del primer evento del ciclo". |
| Pérdida de semántica de `every_payday` para commitments migrados | Alta | Bajo | Banner de "Revisá tus commitments" en `/settings` post-migración. |
| `createProfile` cambia signature; clientes con formularios cacheados rompen | Baja | Medio | Migración atómica; no hay clientes fuera del propio Quipu. |
| La regla "facts over derivations" aplicada a otros casos (no considerados) genera fricción futura | Baja | Bajo | Está documentada en §1.6; se aplica consistentemente. |

---

## 11. Orden de implementación sugerido

1. **Decidir rename de `fixedCommitments`** (cierre de §9 #4). Aceptar `recurringObligations` o mantener `fixedCommitments`.
2. **Fase 1 (widen):** cambios de schema, sin tocar lógica.
3. **Tests smoke** en dev de los flujos existentes (que nada rompió).
4. **Fase 2 (migrate):** backfill de datos.
5. **Validar conteos:** `count(adHocIncomes) === count(incomeEvents)` después del backfill.
6. **Fase 3 (narrow):** actualizar código a modelo nuevo. Reescribir `processPayday` → `processIncomeEvent`. Eliminar campos viejos. Eliminar `FREE_PLAN_MONTHLY_LIMIT`.
7. **Tests E2E** de los flujos de onboarding, payday, expense, coach.
8. **Migración de errores a `ConvexError`** (paralelo a fase 3, no es bloqueante).
9. **Banners post-migración** en `/settings` para usuarios migrados.
10. **Spec del onboarding v2.5** (siguiente proyecto, depende de este spec aprobado).
11. **Spec del motor de cascada para `variable`/`mixed`** (siguiente proyecto, depende de este spec aprobado).
12. **Spec del dashboard v2.5** (siguiente proyecto).

---

## 12. Cómo se conecta con el spec del onboarding actual

El spec `2026-07-07-onboarding-design.md` (comiteado en `fa6190d`) describe un wizard de 8 pasos basado en el modelo viejo (`workerType`, "sueldo" como primitivo, `payFrequency` obligatorio). **Ese spec queda congelado** y se reescribirá desde cero en un spec hijo (`2026-XX-XX-onboarding-v25-design.md`) **después** de que este spec sea aprobado e implementado.

El onboarding no se implementa en serio hasta que v2.5 esté migrado. Si se hace antes, se estarían escribiendo formularios que cambian al toque.

---

**Próximo paso:** review del usuario. Si hay cambios, se aplican. Si está OK, se commitea y se pasa a `writing-plans` para crear el plan de implementación detallado (que cubre las 3 fases de la migración).

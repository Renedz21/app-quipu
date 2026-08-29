# Diseño — Flujo de destino del ahorro (Asistente de asignación)

> Fecha: 2026-08-28 · Estado: aprobado en brainstorming, pendiente plan de implementación
> Contexto: Bloque 6 - Ahorros (§8.2). Decisiones tomadas con el usuario por secciones.

## 1. Problema

El dinero que cae al sobre de ahorro del ciclo (por el % de reparto al confirmar
ingresos) queda "sin destino" hasta que el usuario hace aportes manuales uno por uno
a Fondo o metas. Exigir botones y pasos por cada movimiento no es adecuado: queremos
un proceso más automatizado sin saturar de preguntas, y que la sugerencia se base en
el estado real del usuario.

## 2. Decisión de producto

**Sugerencia única editable** (mezcla de prioridad inteligente + reparto con preview):

- Un solo asistente que se activa cuando hay saldo sin asignar en el cuadro de ahorro.
- El motor calcula el reparto propuesto según el estado real (Fondo incompleto,
  metas activas, saldo sobrante).
- Si la sugerencia sirve, la interacción feliz es **un solo tap** ("Confirmar reparto").
- El usuario puede editar cada línea antes de confirmar (agencia sobre sus metas).

**Activación (v1):**
- **Card CTA en `/savings`** (superficie principal): "Tienes S/ X sin asignar en tu
  ahorro del ciclo" + botón "Decidir destino". Aparece solo cuando
  `savingsEnvelopeRemainingCents > 0`.
- **Coach nudge** (capa barata): reutiliza la maquinaria de nudges pendientes (P1-5)
  con copy suggest-only y CTA al asistente.
- **Gancho post-ingreso: diferido.** No se acopla al flujo de ingresos en v1; si la
  telemetría muestra que el nudge no funciona, se reabre.

## 3. Experiencia (UI)

- **Asistente:** Sheet bottom en móvil / Dialog centrado `max-w-[400px]` en desktop
  (patrón P3-5/P3-7 de movimientos y compromisos).
- **Estructura:**
  1. Header: "¿Qué hago con tu ahorro?" + monto disponible.
  2. Líneas de reparto prellenadas por el motor (destino + monto editable con el
     keypad existente). Máximo 1 línea por destino (Fondo + metas activas).
  3. Fila total con validación en vivo (total > 0 y ≤ disponible).
  4. CTA "Confirmar reparto" → success con deltas (mismo patrón que ingresos).
  5. Link secundario "Prefiero decidirlo después" (cierra; no pasa nada).
- **Copy:** tokens §3.8, sin emojis, tono Quipu. Microcopy de rationale desde el motor.
- **Estados:** añadir estado al `CycleSavingsSectionSkeleton` para la card CTA.

## 4. Motor de sugerencia — `convex/lib/savingsAssignPlan.ts`

Función pura, TDD, sin acceso a DB (recibe slices; estilo `savingsMath`/`crisisResolution`).

**Input:** disponible (`remainingAmount` del sobre savings), Fondo
`{currentAmount, targetCents}`, metas `[{id, label, currentAmount, targetAmount}]`.

**Lógica de prioridad (determinista):**

1. **Fondo por debajo de su objetivo** → toda la sugerencia al Fondo, limitada a lo
   que falta para completarlo si el disponible alcanza.
2. **Fondo completo** → reparto en cascada a metas: completa primero la meta más
   cercana a su objetivo (menor `remaining`), luego la siguiente; metas sin
   `targetAmount` reciben lo sobrante.
3. **Sin metas** (o todas completas) → todo al Fondo (puede rebasar su objetivo;
   es excedente legítimo).
4. **Disponible 0** → no hay plan.

**Output:**

```ts
type AssignPlan = {
  lines: Array<{
    subEnvelopeId: string;
    label: string;
    suggestedCents: number;
    remainingToTargetCents: number;
  }>;
  totalCents: number;
  rationale: string; // microcopy: "Completamos tu Fondo de emergencia primero"
};
```

**Reglas duras:** céntimos enteros, nunca negativos, `Σ líneas ≤ disponible`.
La sugerencia **no se persiste**: el plan se calcula en `getSavingsOverview`
(reutiliza el Fondo, metas y saldo ya cargados allí; evita una query extra).

## 5. Backend y refactor

**Mutación nueva — `assignSavingsEnvelope`** (`convex/savings.ts`):

- Args: `lines: [{subEnvelopeId, amount}]`.
- Validación: enteros > 0; destinos pertenecen al perfil y a `parentEnvelopeType:
  "savings"`; `Σ amounts ≤ remainingAmount` del sobre savings del ciclo activo.
- Aplica todo **en una transacción**: decrementa `remainingAmount` del sobre,
  incrementa `currentAmount` de cada `subEnvelope`, registra contribuciones
  reutilizando el mecanismo de `executeContribution` (extraer la parte de
  persistencia a un helper común si hace falta).
- Returns: deltas por destino + totales (patrón `moveSurplusToSavings`) para el
  success.

**Refactor — eliminar duplicado (no dejar código basura):**

- `contributeToGoal` y `contributeToSubEnvelope` son **idénticos** (ambos delegan en
  `executeContribution`, convex/savings.ts:467 y :568). Se conserva **uno solo**
  (`contributeToSubEnvelope`, nombre genérico; "goal" es solo UI). Migrar call sites
  del front (`/savings/fund`, metas) y borrar `contributeToGoal`.

**Lo que NO se toca:** `moveSurplusToSavings` (semántica de sobrantes por origen,
dominio distinto), `createSavingsGoal`, invariantes §5.5.

## 6. Frontend (`modules/savings/`)

- `AssignSavingsSheet`: líneas editables (keypad existente de gastos), fila total,
  validación en vivo, success con deltas.
- Card CTA en `CycleSavingsSection` (solo con saldo sin asignar) + skeleton.
- Coach nudge: fila nueva en `modules/coach/` reutilizando nudges pendientes.

## 7. Testing (§6.5)

- **TDD puro:** `savingsAssignPlan.test.ts` — prioridad (fondo incompleto, fondo
  completo + cascada de metas, sin metas, disponible 0), límites, céntimos.
- **Mutación:** validaciones de `assignSavingsEnvelope` (perfil ajeno,
  Σ > disponible, montos inválidos).
- **Invariantes:** suite `financialInvariants.test.ts` intacta (el reparto no rompe
  balance de sobres).
- **Smoke E2E manual:** sugerencia → editar línea → confirmar → success → card
  desaparece.
- **Lint + typecheck:** `pnpm lint`, `pnpm build:next`.

## 8. Skills obligatorias durante la implementación

Además de `caveman`/`ponytail` (siempre activos según §7.1):

- `vercel-react-best-practices` — componentes del sheet, card CTA y estado del coach.
- `next-best-practices` — rutas/wiring de `/savings` y estructura de módulos.
- `nodejs-best-practices` — lib pura del motor y mutación Convex (Node backend).

## 9. Fuera de alcance (v1)

- Gancho post-ingreso (C). Preferencias de reparto persistidas por perfil. Metas
  compartidas (Modo Pareja). Automatización total sin confirmación (viola
  *sugerir → confirmar → transferir*, §5.3).

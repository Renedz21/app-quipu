# Spec — Corrección de ciclo simplificada (wizard) — 2026-08-28

## Problema

El formulario actual de `/cycle/correct` pide al usuario escribir **saldos absolutos restantes**
de cada sobre (N/G/A), "por repartir", reservado y aportes. Es un formulario contable: exige
hacer las cuentas a mano y entender reconciliación bancaria. Un usuario que ingresó mal un monto
no puede corregirlo fácilmente.

Caso de ejemplo: depositan 3,800; de esos, 2,500 deben separarse para una cuota fija
(compromiso). Solo 1,300 es repartible en sobres. El usuario ya colocó los 3,800 completos
y no tiene forma sencilla de corregirlo.

## Solución

Reemplazar el formulario actual por un **wizard de 3 pasos** en `/cycle/correct`.
El formulario técnico **se elimina** (no coexiste).

### Paso 1 — Ingreso real

- Un campo de monto (keypad numérico, mismo patrón que registro de gastos).
- Copy: "¿Cuánto dinero entró realmente este ciclo?".
- Prellenado con el total actual del ciclo cuando aplique.

### Paso 2 — Dinero con dueño

- Campo de monto: "¿Cuánto ya está apartado para compromisos?".
- Una de tres opciones (radio):
  1. **Elegir compromiso existente** — lista de compromisos activos con búsqueda.
  2. **Crear compromiso rápido** — nombre + cuota por ciclo; se crea y se liga la reserva.
  3. **Apartar sin compromiso** — reserva genérica sin compromiso asociado.
- Validación: reservado ≤ ingreso (Paso 1). Si no, aviso amable y no avanza.

### Paso 3 — Repartir lo libre

- Header vivo: "Tus sobres quedarán con S/ X en total · Ya gastaste S/ Y este ciclo; ese dinero
  sale en la corrección" (Y = gastado del ciclo, visible como gastado, nunca como "por repartir").
- **Propuesta automática**: % de asignación del perfil (p. ej. 50/30/20) aplicado al monto
  libre, **menos lo ya gastado en cada sobre este ciclo**, piso 0.
- Ajuste con **steppers +/−** (sin campos de texto).
- Botones rápidos: "50/30/20" (restaurar propuesta), "Reiniciar".
- Excedente no asignado va a "sin asignar" con nota clara; nunca bloquea el envío.
- Si lo ya gastado supera la propuesta de un sobre, ese sobre queda en 0 y se avisa
  ("Ya gastaste más de lo que te tocaría en Gastos"); el excedente se cubre con los
  otros sobres / sin asignar.

### Confirmación

- Resumen en lenguaje humano: "S/ 2,500 reservados para *Cuota auto* · S/ 1,300 repartidos
  (N 650 / G 390 / A 260) · S/ 0 sin asignar".
- Botón "Aplicar corrección" → mutación existente.

## Arquitectura

### Backend: **sin cambios**

El wizard produce el mismo `CycleCorrectionPlan` que consume
`convex/cycleCorrection.correctActiveCycleAllocation` hoy:

- `setEnvelopeRemaining` = saldos propuestos por sobre.
- `reserveToCommitments` = `[{ commitmentId, amountCents }]` (o vacío si "sin compromiso").
- `setUnallocatedCents` = solo el monto de "apartar sin compromiso" (el backend no tiene
  reserva genérica sin `commitmentId`). El sobrante `libre − Σtargets` (dinero ya gastado
  en el ciclo) **no** va a "sin asignar": sale del sistema vía `declaredLiquidCents`.
- `declaredLiquidCents` = Σtargets + reservado a compromiso + apartado genérico (estado
  final autoconsistente). El backend genera la transferencia `liquidity_reconciliation`
  que absorbe la diferencia contra el líquido actual de Quipu (gastado del ciclo y/o
  diferencia entre ingreso declarado y registrado). Corrige el bug de dinero fantasma
  detectado en smoke (2026-08-28).
- `contributeToSavings` queda fuera de este flujo (los aportes a metas se manejan en `/savings`).
- `declaredLiquidCents` se omite; la reconciliación la resuelve `buildCycleCorrectionTransfers`.

### Lógica pura nueva (TDD)

`modules/cycle-correction/lib/`:

- `buildSimpleCorrectionPlan({ incomeCents, reservedCents, allocation, spentPerEnvelope })`
  → `{ plan, remainingByEnvelope, unallocatedCents }`.
- Cálculos puros y testeables; la UI solo renderiza.

### Validaciones — Zod

Los inputs del wizard se validan con **zod** (patrón del repo):

- `simpleCorrectionWizardSchema`: `incomeCents` (entero > 0), `reservedCents` (entero ≥ 0,
  refinamiento `≤ incomeCents`), `mode` (`existing | create | generic`), `commitmentId`
  (requerido si `existing`), `newCommitment` (nombre + cuota si `create`), steppers del
  Paso 3 (enteros ≥ 0).
- `safeParse` antes de construir el plan; mensajes en español, sin jerga técnica.

## Detección de inconsistencia de ingreso (addendum V1 — 2026-08-28)

El ingreso del Paso 1 es una **declaración**; Quipu puede tener registrado otro monto.
Para que ningún ajuste sea silencioso:

- **Query de lectura** `cycleCorrection.getRegisteredCycleIncome` → suma de
  `incomeEvents` del ciclo activo (céntimos). Solo lectura, sin schema ni mutaciones.
- **Sin ingreso registrado (0)** → gate duro en el Paso 1: "Aún no registras tu ingreso
  de este ciclo" + explicación + CTA a `/income/register`. El wizard no aparece.
- **Declarado = registrado** → flujo normal, sin fricción.
- **Declarado ≠ registrado** → aviso visible en el Paso 1 con la aritmética:
  "Quipu tiene registrado X · Declaras Y · La diferencia (±Z) entrará/saldrá como
  ajuste de conciliación". Require checkbox de confirmación para habilitar Continuar.
- **Tope real (2026-08-28, post-smoke):** `Σtargets + apartado ≤ ingreso − gastado del
  ciclo`. Lib lanza error; UI bloquea con "Solo tienes X disponibles (Y − Z gastado)".
  `reservedMode` gana `"none"` (default, "No voy a apartar nada todavía"); modos con
  apartado exigen monto ≥ 1.
- **Resumen final enriquecido** (Paso 3): línea de conciliación cuando haya diferencia
  ("Quipu tenía X · Ajuste ±Z"), junto al total de sobres y lo ya gastado.

Fuera de alcance: sandbox/demo con dinero ficticio (el wizard ya es preview);
advertencias equivalentes en `/income/register`.

## Errores y casos borde

| Caso | Comportamiento |
|---|---|
| Reservado > ingreso | Bloquea avance en Paso 2 con aviso amable. |
| Ya gastado > propuesta de sobre | Sobre en 0 + aviso; excedente a otros sobres / sin asignar. |
| Ciclo legacy / `needsReview` | Mismo acceso que hoy. |
| Sin ciclo activo | Mensaje actual se conserva. |
| Error de servidor | `serverError` visible sobre los botones de acción (patrón actual). |

## Testing

- **Unit (TDD):** `buildSimpleCorrectionPlan` — propuesta por %, piso 0, excedente,
  reservado > ingreso, reservado = ingreso (libre 0), gasto > propuesta.
- **Unit:** schema zod — cada refinamiento con caso válido/inválido.
- **Componente:** wizard — navegación entre pasos, bloqueo en validación, resumen final
  (mismo patrón que tests de wizards existentes).
- `pnpm vitest run` verde + lint + typecheck antes de PR.

## Fuera de alcance

- Aportes a metas de ahorro dentro del wizard (`/savings` los cubre).
- Cambios en `convex/` (ni schema ni mutaciones).
- Coach / espacios: corrección es personal-domino only (como hoy).

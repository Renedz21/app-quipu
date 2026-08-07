# Alinear backend Convex a invariantes I1–I8 — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que `convex/**` cumpla de forma consistente las invariantes de dominio §5.5 / ADR 2026-08-07 (Pagado=solo señal, congelar literal, Plus vs gratis, `needsReview`≠unallocated, admin interno, auth común, export completo, cron por candidatos).

**Architecture:** Primero corregir violaciones de dominio (I1, I3, I4); luego endurecer plataforma (I2 gaps, I5, I6, I8). No reescribir motores puros ya correctos (`commitmentCoverage`, `spendableBalance`, `budgetMath`). Tests TDD en libs + smoke de glue.

**Tech Stack:** Convex, TypeScript, Vitest, documento maestro §5.5, ADR en `docs/adr/`.

## Global Constraints

- Fuente de verdad: `docs/QUIPU-MASTER.md` §5.5 (I1–I8).
- Español en mensajes de error de usuario; inglés en identificadores de código.
- Dinero en céntimos enteros; no inventar gastos al marcar Pagado.
- Diff mínimo: no refactor cosmético de god-files salvo lo necesario para las puertas de auth.
- Verificar con `pnpm exec vitest run convex/lib` antes de afirmar éxito.

## Mapa de violaciones (estado post-alineación 2026-08-07)

| Inv. | Estado en código | Archivos |
|---|---|---|
| I1 | **Cumple** — `markCommitmentAsPaid` solo señal + libera reservas | `fixedCommitments.ts`, `commitmentReservation.ts` |
| I2 | **Cumple** — gastos + salidas (rescate/cover/corrección) respetan freeze | `expenses.ts`, `coachEngine`, `cycleCorrection`, `envelopeGuards` |
| I3 | **Cumple** — rescate gratis; cover/crisis plan Plus | `coachEngine.ts` |
| I4 | **Cumple** — income create/update/delete no setean `needsReview` por unallocated | `incomeEvents.ts` |
| I5 | **Cumple** — admin `internal*`; runbook sin `adminSecret` | `admin/*`, `docs/abuse-response-runbook.md` |
| I6 | **Cumple (parcial migrado)** — `requireActiveAccount` en dinero/coach; queries soft-auth OK | `lib/entitlements.ts` + mutaciones |
| I7 | **OK** — export/delete/APP_DATA_TABLES | `profiles.ts`, `appDataTables.ts` |
| I8 | **Cumple** — cron por `needsContentReview`; marcado al escribir texto | `schema`, `contentReviewScan`, `markNeedsContentReview` |

---

### Task 1: I1 — Pagado solo señal

**Files:**
- Modify: `convex/fixedCommitments.ts` (`markCommitmentAsPaid`)
- Modify: `convex/lib/commitmentReservation.ts` (si hace falta helper de liberación pura)
- Replace/rewrite: `convex/lib/commitmentPaymentSettle.test.ts` → contrato «libera reservas, no gasto»
- Test: nuevo o reescrito en `convex/lib/` + assert de comportamiento esperado

**Steps:**
- [ ] Escribir test que fije: al «pagar», reservas activas del compromiso pasan a liberadas; **cero** inserts en `expenses`; **cero** patches de `envelopes.remainingAmount` por débito de pago.
- [ ] Correr test y confirmar que falla con la implementación actual.
- [ ] Reescribir `markCommitmentAsPaid`: auth + ciclo activo + `paidAt`/`paidForCycleId`/`nextDueAt`; liberar reservas del compromiso en el ciclo (patch `releasedCents`/`status: "released"` o helper existente `applyReleaseReservation`); **sin** `applyPayFromReservations` + gasto.
- [ ] Correr tests `convex/lib` y ajustar.
- [ ] Commit: `fix(convex): markCommitmentAsPaid is signal-only per I1`

---

### Task 2: I3 — Matriz crisis gratis vs Plus

**Files:**
- Modify: `convex/coachEngine.ts`
- Test: si hay tests de entitlements o coach; si no, test mínimo de política en lib pura opcional

**Steps:**
- [ ] Quitar `requirePremiumProfile` de `applyRescueTransfer` (sigue exigiendo cuenta activa/ownership).
- [ ] Añadir `requirePremiumProfile` a `applyCoverFromCycleSavings`.
- [ ] Dejar `postponeCommitmentForCycle` y `snoozeCrisisCoach` sin Plus; `applyCrisisPlan` con Plus.
- [ ] Commit: `fix(convex): align crisis entitlements with I3`

---

### Task 3: I4 — Separar `needsReview` de unallocated

**Files:**
- Modify: `convex/incomeEvents.ts` (create / update / delete)
- Modify: `convex/cycleCorrection.ts` solo si setea `needsReview` por motivos distintos a anomalía
- Test: helper puro opcional `shouldMarkNeedsReview` si hay lógica no trivial

**Steps:**
- [ ] En create: **no** setear `needsReview: true` solo porque `addedUnallocated > 0`; actualizar `unallocatedCents` sí.
- [ ] En update: no asignar `needsReview = addedUnallocated > 0`.
- [ ] En delete: no setear `needsReview: otherIncomes.length > 0`.
- [ ] Dejar `needsReview: true` solo en migración legacy / `markActiveCycleNeedsReview` / caminos de anomalía explícitos.
- [ ] Commit: `fix(convex): needsReview means anomaly only (I4)`

---

### Task 4: I2 — Congelar también bloquea salidas

**Files:**
- Modify: `convex/coachEngine.ts` (rescate, cover, crisis plan que mueva sobres)
- Modify: `convex/cycleCorrection.ts` (transferencias que bajen remaining de sobres congelados)
- Modify: `convex/lib/envelopeGuards.ts` (+ tests)

**Steps:**
- [ ] Extender tests de `isEnvelopeFrozen` / helper `assertEnvelopeAllowsOutbound`.
- [ ] Antes de patch saliente en rescate/cover/corrección: rechazar si el sobre origen está congelado.
- [ ] Commit: `fix(convex): frozen envelopes block outbound transfers (I2)`

---

### Task 5: I6 — Puerta `requireActiveAccount`

**Files:**
- Modify: `convex/lib/entitlements.ts` (alias/documentar `requireActiveAccount` = autenticado + no suspendido)
- Modify gradualmente: `incomeEvents`, `expenses`, `fixedCommitments`, `coachEngine`, `savings`, `cycleCorrection`, `settings`, `dashboard` queries que hoy repiten identity+profile

**Steps:**
- [ ] Exportar `requireActiveAccount` (nombre canónico §5.5) reutilizando `requireAuthenticatedProfile`.
- [ ] Migrar mutaciones de dinero/coach a esa puerta (ownership de recursos se mantiene aparte).
- [ ] Test unitario de suspensión ya existe; ampliar si hace falta.
- [ ] Commit: `refactor(convex): requireActiveAccount as shared auth gate (I6)`

---

### Task 6: I5 — Admin solo internal

**Files:**
- Modify: `convex/admin/suspension.ts`, `convex/admin/investigation.ts`
- Check: callers en repo (`rg adminSecret` / `api.admin`)

**Steps:**
- [ ] Buscar usos de las mutaciones públicas admin.
- [ ] Convertir a `internalMutation` (quitar `adminSecret` de la API pública o dejar solo internal + dashboard).
- [ ] Actualizar runbooks (`docs/abuse-response-runbook.md` si aplica).
- [ ] Commit: `fix(convex): move admin ops to internal functions (I5)`

---

### Task 7: I8 — Cron por candidatos

**Files:**
- Modify: `convex/schema.ts` si hace falta bandera (`needsContentReview` en profile) **o** reutilizar `accountReviewFlags` / cola existente
- Modify: `convex/crons/contentReviewScan.ts`
- Modify: puntos que marquen candidato (p. ej. al crear ingreso con texto, o admin)

**Steps:**
- [ ] Definir modelo mínimo: perfil con `needsContentReview: true` **o** query solo flags abiertos / cola.
- [ ] Cron: procesar candidatos, no `profiles.take(200)` fijo sin cursor.
- [ ] Commit: `fix(convex): content scan processes candidates only (I8)`

---

### Task 8: Verificación y docs

**Files:**
- Verify: `docs/QUIPU-MASTER.md` §5.5, ADR, este plan
- Run: `pnpm exec vitest run convex/lib`

**Steps:**
- [ ] Correr suite `convex/lib` completa (0 fallos).
- [ ] Revisar checklist I1–I8: cada fila «viola» debe pasar a «cumple» o «parcial documentado».
- [ ] Actualizar PR con resumen de alineación.
- [ ] Commit final si quedan docs: `docs: note I1–I8 alignment complete`

---

## Orden recomendado

1 → 2 → 3 (dominio financiero y producto) → 4 → 5 → 6 → 7 → 8.

No empezar por I6/I5 si I1 sigue violado: el modelo de Pagado es la contradicción más cara.

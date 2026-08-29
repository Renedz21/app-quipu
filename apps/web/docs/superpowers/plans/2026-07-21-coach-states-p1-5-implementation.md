# P1-5 — Coach estados advertencia y sugerencia

> **Goal:** Completar los 4 estados del coach en dashboard: advertencia (ámbar) y sugerencia (acción pendiente), además de tranquil/crisis ya parciales.

**Why now:** Prerequisito de P1-2 (`applyRescueTransfer`). P1-1 cascada es independiente pero más grande; P1-5 cierra el delta del Bloque 7 y alinea `WANTS_OVERFLOW_60` con semántica suggest-only.

## Alcance

1. **`convex/lib/coachState.ts`** — `resolveCoachPresentation` (TDD), mensajes canon, `buildWantsOverflowNudge`, `computeUncoveredCommitmentsCents`.
2. **`convex/dashboard.ts`** — usar resolver puro; pending nudge → `suggestion` (no crisis).
3. **`convex/expenses.ts`** — copy suggest-only sin emojis; opciones canon.
4. **`modules/dashboard/components/coach-card.tsx`** — estilos ámbar (warning), sugerencia (fila propia), crisis (danger).
5. **`modules/dashboard/components/dashboard-view.tsx`** — warning/suggestion/crisis en fila completa.

## Reglas de resolución (prioridad)

1. `pendingCoach` → **suggestion** + options + interactionId
2. `isEarlyCycle` → **contigo**
3. `compliance === failed` o compromisos `uncovered` → **crisis**
4. `compliance === warning` → **warning**
5. default → **tranquil**

## Fuera de alcance

- P1-2: `applyRescueTransfer`, diálogo confirmación
- Crisis como hero full-screen (solo card danger fila propia en dashboard)
- CTAs activos de advertencia/crisis (placeholder disabled)

## Criterios de cierre

- [x] Vitest `coachState.test.ts` verde
- [x] Dashboard muestra badge Advertencia/Sugerencia con estilos canon
- [x] `WANTS_OVERFLOW_60` pending → kind `suggestion` en `getSummary`
- [x] `pnpm test --run`, `pnpm typecheck`, `pnpm test:e2e:smoke` sin regresiones

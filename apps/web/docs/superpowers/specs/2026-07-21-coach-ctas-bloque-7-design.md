# Bloque 7 — Coach CTAs advertencia/crisis — Spec (2026-07-21)

> Completar CTAs activos del coach en dashboard para advertencia y crisis (P1-10).

## Decisiones

1. **Advertencia:** "Ajustar ciclo" → `/income/register`; "Ver en qué" → scroll a `#dashboard-envelopes`.
2. **Crisis opción A:** transferir del sobre `savings` del ciclo (no sub-envelopes / fondo) vía `coverageBoost` en `financialCycles`.
3. **Crisis opción B:** posponer el compromiso wants más pequeño (`postponedForCycleId` en `fixedCommitments`).
4. **Crisis dismiss:** `coachCrisisSnoozedUntil` en profile (24 h) → downgrade a advertencia.
5. **Dominio puro:** `convex/lib/crisisResolution.ts` (TDD) para opciones, split y copy.

## Backend

| Función | Tipo | Rol |
|---|---|---|
| `applyCoverFromCycleSavings` | mutation | Mueve saldo savings→needs/wants + boost cascada |
| `postponeCommitmentForCycle` | mutation | Marca compromiso pospuesto en ciclo activo |
| `snoozeCrisisCoach` | mutation | Snooze 24 h del hero crisis |
| `buildCrisisCoachOptions` | pura | Labels canon para UI |

## Fuera de alcance

- Pantalla coach dedicada / nav Coach
- Hero crisis full-screen (solo card danger fila propia)
- Tranquilo CTAs ("Ver detalle", "Guardar de más")
- Reset automático de `postponedForCycleId` al cerrar ciclo (diferido)

## Criterios de cierre

1. Warning/crisis CTAs activos en `coach-card.tsx`
2. TDD `crisisResolution` + tests cascada boost/postpone
3. `pnpm tsc --noEmit`, `pnpm test` sin regresiones
4. §3.7 y §8 actualizados (P1-10)

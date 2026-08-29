# P1-10 — Coach CTAs advertencia/crisis — Implementation Plan (2026-07-21)

## Slice 1 — Dominio (TDD)

- [x] `convex/lib/crisisResolution.ts` + tests
- [x] Extender `commitmentCoverage` con `coverageBoost` + `excludedCommitmentIds`

## Slice 2 — Backend Convex

- [x] Schema: `coverageBoost`, `postponedForCycleId`, `coachCrisisSnoozedUntil`
- [x] `coachEngine`: `applyCoverFromCycleSavings`, `postponeCommitmentForCycle`, `snoozeCrisisCoach`
- [x] `dashboard.getSummary`: `crisisOptions` + snooze

## Slice 3 — UI

- [x] `modules/coach/components/coach-crisis-actions.tsx`
- [x] `coach-card.tsx`: warning scroll/register + crisis actions
- [x] `#dashboard-envelopes` anchor en sobres

## Slice 4 — Docs y verificación

- [x] Spec `docs/superpowers/specs/2026-07-21-coach-ctas-bloque-7-design.md`
- [x] Actualizar `docs/QUIPU-MASTER.md`
- [x] `pnpm tsc --noEmit`, `pnpm test`

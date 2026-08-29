# Bloque 6 — Ahorros — Implementation Plan (2026-07-21)

## Slice 1 — Dominio (TDD)

- [x] `convex/lib/savingsMath.ts` + tests
- [x] `modules/savings/lib/savingsCopy.ts` + tests

## Slice 2 — Backend Convex

- [x] `convex/savings.ts`: `getOverview`, `getEmergencyFundDetail`, `contributeToSubEnvelope`, `createSavingsGoal`, `contributeToGoal`

## Slice 3 — UI overview

- [x] `modules/savings/components/savings-view.tsx`
- [x] `emergency-fund-hero.tsx`, `savings-goal-card.tsx`, `new-goal-dialog.tsx`
- [x] `app/(app)/savings/page.tsx`

## Slice 4 — Detalle fondo + nav

- [x] `emergency-fund-detail-view.tsx`, `savings-contribute-button.tsx`
- [x] `app/(app)/savings/fund/page.tsx`
- [x] Habilitar `/savings` en `SIDEBAR_ITEMS` y `BOTTOM_NAV_ITEMS`

## Slice 5 — Docs y verificación

- [x] Spec `docs/superpowers/specs/2026-07-21-ahorros-bloque-6-design.md`
- [x] Actualizar `docs/QUIPU-MASTER.md` §3.7 / §8
- [x] `pnpm tsc --noEmit`, `pnpm test`

## E2E (opcional, no bloqueante)

- Smoke: navegar a `/savings` post-ingreso y ver hero del fondo.

# Bloque 5 — Ingresos — Implementation plan (2026-07-21)

> **Goal:** Registro manual con preview de impacto, confirmación con deltas, CTAs dashboard, TDD dominio.

## Fase 1 — Dominio (TDD)

- [x] `modules/income/lib/impactPreview.ts` + tests (distribución + disponible hoy proyectado)

## Fase 2 — Backend

- [x] Extender `createIncomeEvent` return: deltas por sobre + `displayDailyCents`

## Fase 3 — Módulo UI

- [x] `modules/income/constants.ts`, `types.ts`
- [x] `IncomeSourceChips`, `IncomeImpactPreview`, `IncomeConfirmation`
- [x] `IncomeRegisterFlow` (form + success)
- [x] Ruta `app/(app)/income/register/page.tsx`

## Fase 4 — Wire dashboard

- [x] `DashboardEmptyCycle` CTA → `/income/register`
- [x] `DashboardHeaderActions` (ingreso sin ciclo / gasto con ciclo)
- [x] `DashboardFab` sin ciclo → ingreso

## Fase 5 — QA + docs

- [x] Smoke E2E: registrar ingreso desde empty state
- [x] `pnpm tsc --noEmit`, `pnpm test --run`, lint archivos nuevos
- [x] Actualizar `docs/QUIPU-MASTER.md` §3.7, §8.2, §8.4, P1-8

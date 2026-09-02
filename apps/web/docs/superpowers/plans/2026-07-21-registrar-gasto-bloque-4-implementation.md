# Bloque 4 — Registrar gasto — Implementation plan (2026-07-21)

> **Goal:** Entregar variantes A/B del registro de gasto (<10s), wire CTAs del dashboard, TDD de dominio, smoke E2E.

## Fase 1 — Dominio (TDD)

- [x] `modules/expenses/lib/keypad.ts` + tests
- [x] `modules/expenses/lib/envelopeSuggestion.ts` + tests

## Fase 2 — Backend

- [x] Extender `registerExpense` return: `{ expenseId, envelopeType, amount, remainingAmount }`

## Fase 3 — Módulo UI

- [x] `modules/expenses/constants.ts`, `types.ts`
- [x] `ExpenseRegisterProvider` + context hook
- [x] `ExpenseKeypad`, `ExpenseEnvelopeStep`, `ExpenseVariantBForm`, `ExpenseConfirmation`
- [x] `ExpenseRegisterFlow` + `ExpenseRegisterShell` (dialog/sheet)

## Fase 4 — Wire dashboard

- [x] `DashboardFab`, `DashboardRegisterButton` (header)
- [x] `EnvelopeCards` click needs/wants
- [x] `CoachCard` early register CTA
- [x] `AppLayoutShell` wrap provider

## Fase 5 — QA + docs

- [x] Smoke E2E: abrir "Nuevo gasto" + registrar desde UI
- [x] `pnpm tsc --noEmit`, `pnpm test`, `pnpm lint` (archivos nuevos formateados; deuda P2-6 preexistente)
- [x] Actualizar `docs/QUIPU-MASTER.md` §3.7, §8.2, §8.4

## Diferido

- **Variante C:** sin infraestructura de detección; documentar en spec y §8.

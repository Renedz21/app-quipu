# P1-1 — Motor de cascada de compromisos

> **Goal:** Reemplazar la heurística MVP (`remaining >= amount`) con cobertura real desde `incomeEvents` del ciclo activo.

## Alcance

1. **`convex/lib/commitmentCoverage.ts`** — `computeCommitmentCoverage`, `computeAllCommitmentCoverage`, estados covered/partial/not-started/overdue (TDD).
2. **`convex/lib/evaluateCommitmentCoverage.ts`** — persistencia `coveredAt` / `coveredBy` en `fixedCommitments`.
3. **`convex/schema.ts`** — campos opcionales `coveredAt`, `coveredBy`.
4. **`convex/incomeEvents.ts`** — evaluar cobertura tras `createIncomeEvent` / `deleteIncomeEvent`; limpiar al abrir ciclo nuevo.
5. **`convex/fixedCommitments.ts`** — query `getCommitmentCoverage`.
6. **`convex/dashboard.ts`** — usar motor cascada + `remaining` para coach crisis.
7. **`modules/dashboard/components/commitments-list.tsx`** — barra de progreso y % parcial.

## Reglas de cascada

- Solo `incomeEvents` dentro de `[cycle.startDate, cycle.endDate)`.
- Por sobre (`needs` / `wants`), ordenar compromisos por `dueDay` asc.
- Consumir asignaciones del sobre en orden cronológico de ingresos.
- **Overdue:** día Lima > `dueDay` y `remaining > 0`.

## Fuera de alcance

- Backfill histórico de `coveredAt` (opcional en deploy).
- UI de detalle de compromiso / pantalla Compromisos.

## Verificación

- `pnpm test --run`
- `pnpm typecheck`
- `pnpm test:e2e:smoke`

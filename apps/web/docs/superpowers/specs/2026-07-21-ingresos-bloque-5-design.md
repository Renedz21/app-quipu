# Bloque 5 — Ingresos "¿Cuánto entró y a dónde va?" — Spec (2026-07-21)

> Registro manual de ingresos con preview de impacto siempre visible y confirmación con deltas por sobre.
> **Extensión extraordinaria (5N):** ver `2026-07-21-ingresos-extraordinarios-bloques-5-6-design.md` (P2-7).

## Decisiones

1. **Ruta dedicada:** `/income/register` — página full-screen (web y móvil). **No** bottom sheet (diferente de Bloque 4).
2. **Layout web:** 2 columnas — inputs (monto Newsreader 34, origen chips, fecha hoy) + panel **Impacto en tus sobres** siempre visible.
3. **Layout móvil:** misma página apilada; ocupa viewport completo dentro del shell de la app.
4. **Origen:** chips mapeados al enum backend (`payroll`…`other`); **no** texto libre como origen.
5. **Descripción:** obligatoria en backend — `concepto.trim() || labelDelChip`.
6. **Fecha:** default hoy (`occurredAt: startOfToday Lima` o `Date.now()`); display "Hoy · 16 jul"; sin selector retroactivo en v2.5.
7. **Distribución:** todo ingreso se reparte automáticamente según porcentajes del perfil; sin opción "no repartir".
8. **Preview client-side:** `modules/income/lib/impactPreview.ts` (TDD) — réplica mínima de `computeAllocations` + proyección de disponible hoy (`wantsRemaining / daysRemaining`).
9. **Confirmación:** `createIncomeEvent` extendido devuelve deltas por sobre + `displayDailyCents` post-mutación (similar a saldo restante en gastos).
10. **CTAs dashboard:** empty state hero → `/income/register`; header sin ciclo → "Registrar ingreso"; FAB sin ciclo → navega a ingreso (en lugar de disabled).

## Flujo

1. Usuario ingresa monto en campo alto editable (`inputMode="decimal"`, Newsreader 34px; `parseToCents` / validación Zod — **sin** keypad de gastos), elige origen (chip), ve preview en vivo.
2. "Registrar ingreso" → `createIncomeEvent`.
3. Pantalla de éxito: deltas por sobre + nuevo disponible hoy + "Volver al inicio".

## Dominio (TDD)

| Módulo | Responsabilidad |
|---|---|
| `impactPreview.ts` | `computeIncomeDistribution`, `computeImpactPreview`, `resolveCycleDaysForPreview` |

## Integración

- `useDashboardSummary` + `useQuery(getMyProfile)` para pesos y sobres actuales.
- CTAs: `DashboardEmptyCycle`, `DashboardHeaderActions`, `DashboardFab`.

## Fuera de alcance

- Sync bancaria, OCR, edición retroactiva de fecha, selector de "no repartir".
- Nav sidebar "Registrar" activo (permanece disabled hasta Bloque futuro).

## Criterios de cierre

1. Registro end-to-end contra `createIncomeEvent` con preview y confirmación.
2. CTAs empty/header/FAB sin ciclo activos.
3. Tests Vitest de `impactPreview` verdes.
4. `pnpm tsc --noEmit`, `pnpm test --run`, lint en archivos tocados.
5. §3.7, §8.2, §8.4 actualizados; P1-8 en roadmap.

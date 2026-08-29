# Dashboard Bloque 3 — Spec (2026-07-21)

> Implementación del Bloque 3 "¿Voy bien?" con 5 niveles del canon v3.0, query única de agregación,
> módulo `modules/dashboard/`, shell autenticado responsive, y cobertura MVP de compromisos.

## Decisiones (confirmadas)

1. **Compromisos:** heurística MVP (`remaining >= amount` → cubierto). Motor cascada P1-1 queda para después.
2. **Layout:** responsive web-first en la misma entrega — sidebar 228px desktop + bottom nav + FAB móvil.
3. **Coach:** pending nudge existente (crisis) + proyección tranquila derivada de saldos; P1-5/P1-2 fuera de alcance.
4. **CTAs registrar/ingreso:** placeholder hasta Bloques 4 y 5.

## Arquitectura

- `convex/dashboard.ts` → `getSummary` (auth + ownership, una query).
- `convex/lib/dashboardMath.ts` → funciones puras con Vitest.
- `modules/dashboard/hooks/use-dashboard-summary.ts` → único punto UI→Convex.
- Server-first: `page.tsx` gate de sesión; datos reactivos en Client Component.

## View model (`DashboardSummary`)

| Sección | Reglas |
|---|---|
| **hero** | `dailyAvailable = floor(wants.remaining / max(daysRemaining, 1))`; display `max(0, …)`; badge vía `evaluateCycleCompliance`; copy tríada §3.8 |
| **cycle** | `null` post-onboarding sin ingreso; métricas en `America/Lima` |
| **envelopes** | Orden fijo needs · wants · savings; `percentRemaining` |
| **commitments** | MVP coverage; orden `daysUntilDue` asc |
| **coach** | Pending → crisis/suggestion; sin pending + ciclo → tranquilo con sum(remaining); sin ciclo → oculto |
| **movements** | Últimos 4 merged expenses + incomeEvents, desc por timestamp |

## Estado vacío (sin ciclo activo)

- Hero: "Tu sistema está listo" + CTA ingreso (placeholder).
- Sin sobres, coach ni movimientos.
- Compromisos del onboarding sí se listan si existen.

## Estado vacío temprano (ciclo activo, sin gastos)

Cuando hay ciclo + sobres pero aún no hay gastos registrados (`detectEarlyCycle`):
sin gastos en el ciclo y (`daysElapsed <= 1` o `movementCount === 0`).

- **Detección:** `convex/lib/dashboardMath.ts` → `detectEarlyCycle`; expuesto como `isEarlyCycle` en `getSummary`.
- **Hero:** mantiene "Disponible hoy" + monto diario; copy "Tu presupuesto ya está repartido…"; badge **Recién empiezas** (`starting`).
- **Sobres:** montos asignados completos; subcopy needs/wants "completo · aún sin gastos"; savings "se aparta al final del ciclo".
- **Compromisos vacíos:** card con icono calendario, copy explicativo, CTA "+ Añadir compromiso" (placeholder).
- **Coach:** kind `contigo`, badge **Contigo**, mensaje bienvenida 50/30/20, CTAs "Registrar primer gasto" / "Ver mi sistema" (placeholder).
- **Movimientos:** card borde punteado centrado; copy "Tu primer movimiento aparecerá aquí…" (oculta ingresos del ciclo en esta fase).

El estado **sin ciclo activo** (`DashboardEmptyCycle`) no cambia.

## UI — 5 niveles (§3.7)

1. **Hero** — Newsreader 64/34px, gradient `--qp-gradient`, badge, barra días. LCP + skeleton.
2. **Sobres** — 3 cards, tokens `--color-steel/clay/moss`.
3. **Compromisos** — header "Todo está cubierto" / "Faltan por cubrir".
4. **Coach** — gradient coach; crisis fila completa.
5. **Movimientos** — 4 items; ingresos verde `--qp-deep`, gastos ink.

## Shell

- Sidebar: Inicio, Registrar, Ahorros, Compromisos, Coach, Ajustes (solo `/dashboard` activo).
- Bottom nav móvil: Inicio, Ahorros, FAB, Compromisos, Ajustes.
- Avatar con inicial serif al pie del sidebar.

## Fuera de alcance

P1-1 cascada, P1-2 rescue apply, P1-5 coach intermedios, P1-6 tokens @theme, registrar gasto, "Ver todo" movimientos.

## Criterios de cierre

1. `/dashboard` muestra 5 niveles con ciclo activo.
2. Empty state correcto sin ciclo.
3. Hero LCP con skeleton por sección.
4. Sidebar + bottom nav + FAB móvil.
5. Tests `dashboardMath` verdes; smoke E2E actualizado; tsc/lint sin regresiones.

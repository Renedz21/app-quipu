# Bloque 6 — Ahorros "¿Qué estoy construyendo?" — Spec (2026-07-21)

> Pantalla de ahorros con Fondo de Emergencia como hero, detalle del fondo y metas secundarias.

## Decisiones

1. **Rutas:** `/savings` (overview) y `/savings/fund` (detalle del fondo). Nav sidebar + bottom nav activan "Ahorros".
2. **Fondo de emergencia:** `subEnvelopes` con `isSystemDefault: true` (creado en onboarding). Meta calculada = 3 × gastos esenciales mensuales (suma de compromisos `needs`; fallback: sobre Necesidades del ciclo activo).
3. **Aporte automático (display):** `allocatedAmount` del sobre `savings` del ciclo activo. No mueve dinero solo por mostrarse.
4. **Aportar ahora:** mutation `contributeToSubEnvelope` mueve saldo del sobre `savings.remainingAmount` → `subEnvelope.currentAmount` (explícito, doble opt-in implícito por botón).
5. **Metas:** hasta 6 custom (`MAX_SAVINGS_GOALS`); grid 3-col web / stack móvil; "+ Nueva meta" con label + meta opcional.
6. **Ajustar aporte:** diferido ("Próximamente") — requiere editar target o % de ciclo.
7. **Sin emoji en UI** (canon §3.1); ícono shield CSS en hero/detalle.

## Backend

| Función | Tipo | Rol |
|---|---|---|
| `getOverview` | query | Hero fondo, total ahorrado, metas, flags ciclo |
| `getEmergencyFundDetail` | query | Detalle con stats y CTA aportar |
| `contributeToSubEnvelope` | mutation | Aporte desde sobre savings |
| `createSavingsGoal` | mutation | Nueva meta |
| `savingsMath.ts` | pura + TDD | Meta 3 meses, meses cubiertos, progreso |

## Fuera de alcance

- Aporte automático silencioso al registrar ingreso (solo display + aporte manual).
- Editar/eliminar metas, aportar a metas custom desde UI (backend `contributeToGoal` listo; UI diferida).
- Gamificación de racha real por aportes (display usa `streaks.currentStreak` como proxy).

## Criterios de cierre

1. `/savings` y `/savings/fund` renderizan con datos reales Convex.
2. Nav Ahorros activo en sidebar y bottom nav.
3. TDD `savingsMath` + `savingsCopy` verdes.
4. `pnpm tsc --noEmit` y `pnpm test` sin regresiones.
5. §3.7 y §8 actualizados.

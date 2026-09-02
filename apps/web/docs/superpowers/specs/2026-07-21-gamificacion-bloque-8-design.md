# Bloque 8 — Gamificación — Design (2026-07-21)

Canon: `quipu-2.html` (Tu progreso + Recompensas) · `docs/QUIPU-MASTER.md` §3.7 Bloque 8.

## Alcance v2.5

| Pieza | Comportamiento |
|---|---|
| Racha | `currentStreak` sube en ciclos **compliant** o **warning**; **failed** reinicia a 0 sin castigo en UI |
| Cierre | Al abrir ciclo nuevo vía `createIncomeEvent`, `evaluateClosedCycle` escribe `cycleHistory` + actualiza `streaks` |
| UI progreso | `/progress`: hero racha + mini chart 12 ciclos + grid 6 logros |
| Recompensas | `/progress/rewards`: Tinta (3), Arcilla (6), informe (12, UI only) + personalización acento/tema/ícono |
| Tema | `AppearanceSync` aplica `.dark` (Tinta) y `data-accent` en `<html>` |

## Fuera de alcance

- PDF informe anual
- Entrada nav/perfil (Bloque 9)
- Puntos, XP, leaderboard

## Backend

- `convex/lib/gamificationMath.ts` (TDD)
- `convex/lib/evaluateClosedCycle.ts`
- `convex/progress.ts`

## Frontend

- `modules/progress/` · rutas `app/(app)/progress/`

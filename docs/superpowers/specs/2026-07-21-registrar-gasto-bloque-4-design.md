# Bloque 4 — Registrar gasto "¿De qué sobre sale?" — Spec (2026-07-21)

> Flujo de registro de gasto en **<10 segundos**, variantes A/B activas, C diferida por falta de infraestructura de detección.

## Decisiones

1. **Variante C (automático):** **Diferida.** No hay OCR, sync bancaria ni pipeline de gastos detectados en v2.5. Se documenta en §8; el UI canon queda para cuando exista `detectedExpenses` o similar.
2. **Sobres válidos:** solo `needs` y `wants` (backend `registerExpense` existente). Tarjeta **Ahorro** no abre registro — el aporte es automático desde el sobre.
3. **Concepto:** opcional; visible en variante B; variante A omite concepto (velocidad).
4. **Fecha:** siempre hoy (`timestamp: Date.now()` en mutation); sin selector.
5. **Contenedor:** `Dialog` centrado en desktop (`md+`); `Sheet` inferior en móvil (`useIsMobile`).
6. **Sugerencia de sobre:** heurística pura client-side en `modules/expenses/lib/envelopeSuggestion.ts` (TDD), usando monto + historial reciente del dashboard.
7. **Confirmación:** mutation extendida devuelve `{ expenseId, envelopeType, amount, remainingAmount }` para copy "Te quedan S/ X en Gustos" sin recalcular en cliente.
8. **Provider global:** `ExpenseRegisterProvider` en `AppLayoutShell` para FAB, header, tarjetas de sobre y CTA coach early cycle.

## Variantes

### A — FAB / header "Registrar"

1. **Monto** — keypad numérico, Newsreader 40–46px, sin separador de miles.
2. **Sobre** — sugerido highlighted + alternativas en un toque; copy "¿De qué sobre sale?".
3. **Listo** — check verde, "Gasto registrado", saldo restante, "Registrado en N segundos".

### B — Desde tarjeta de sobre (needs/wants)

- Modal/sheet con sobre preseleccionado (pill "· preseleccionado").
- Monto (keypad) + concepto opcional en una pantalla.
- Misma confirmación que A.

### C — Automático (diferida)

- Requiere entidad `detectedExpense` + fuente (notificación, SMS, etc.).
- UI: card "Gasto detectado" + "¿Está bien así?" + Sí / Cambiar sobre.

## Dominio (TDD)

| Módulo | Responsabilidad |
|---|---|
| `keypad.ts` | `appendKeypadDigit`, `backspaceKeypad`, `formatKeypadDisplay` |
| `envelopeSuggestion.ts` | `suggestEnvelope`, `extractRecentExpenseEnvelopes` |

## Integración

- `DashboardFab`, `DashboardRegisterButton`, `EnvelopeCards` (needs/wants), `CoachCard` early CTA → `openExpenseRegister()`.
- Sin ciclo activo: botones disabled con tooltip "Registra un ingreso primero" (mismo patrón que placeholders actuales).
- Smoke E2E: abrir flujo desde header + registrar gasto vía UI (opcional si estable).

## Fuera de alcance

- Variante C, OCR, adjuntos, selector de fecha, gastos desde Ahorro.
- Ruta dedicada `/registrar` (sheet/modal sobre dashboard es suficiente).

## Criterios de cierre

1. Variantes A y B funcionales end-to-end contra `registerExpense`.
2. CTAs placeholder del dashboard activos (FAB, header, sobres, coach early).
3. Tests Vitest de keypad + sugerencia verdes.
4. `pnpm tsc --noEmit`, `pnpm test`, `pnpm lint` sin regresiones nuevas.
5. §3.7 y §8 actualizados; C documentada como diferida.

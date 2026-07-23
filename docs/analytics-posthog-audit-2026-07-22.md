# Auditoría PostHog — Quipu 2.0 (2026-07-22)

Informe interno tras inspección del repo en la rama `chore/quipu-2.0`. Resume el estado de la integración, gaps cerrados en esta pasada y decisiones para embudos y retención.

## Arquitectura actual

| Capa | Ubicación | Rol |
|------|-----------|-----|
| SDK browser | `instrumentation-client.ts` → `initPostHog()` | Inicialización única |
| Cliente | `core/analytics/client.ts` | Session replay, autocapture, excepciones |
| Eventos tipados | `core/analytics/events.ts` | Constantes + Zod + `AnalyticsEventPayloads` |
| Emisión | `core/analytics/track.ts` | `track()`, `identify()`, `reset()`, `captureException()` |
| Props helpers | `core/analytics/properties.ts`, `last-login.ts`, `client-context.ts`, `cycle-events.ts` | Mappers y contexto de dispositivo |
| Feature flags | `core/analytics/feature-flags.ts` + `hooks/use-analytics.ts` | Flags tipados y hooks |
| Identidad | `shared/components/providers/convex-provider.tsx` | `PostHogIdentity` + pageviews |
| Pageviews | `hooks/use-analytics.ts` → `PostHogPageviewTracker` | `$pageview` por ruta (replay/heatmaps) |

**Regla:** ningún módulo importa `posthog-js` fuera de `core/analytics/` (cumplido).

## Rutas reales vs. supuestos del brief

| Pantalla (brief) | Ruta / superficie actual |
|------------------|---------------------------|
| Sign-up | `/sign-up` |
| Sign-in | `/sign-in` (+ passkey en vista) |
| Auth hub | `/auth` |
| Onboarding | `/onboarding` (wizard client-side, pasos 1–3 + success) |
| Dashboard | `/dashboard` |
| Ingresos | `/income/register` |
| Gastos | Modal FAB / clic en sobre (`EnvelopeCards` → `ExpenseRegisterProvider`), no `/expenses/new` |
| Ahorro | `/savings`, `/savings/fund`, `/savings/move` |
| Coach | Bloque en `/dashboard` (`CoachCard`, crisis/rescue) |
| Settings | `/settings`, `/settings/allocations`, `/settings/cycle` |
| Progreso / resúmenes | `/progress` |

## Eventos existentes (catálogo)

Todos definidos en `AnalyticsEvents` (`core/analytics/events.ts`). Nombres en snake_case alineados al brief.

### Autenticación

- `user_signed_up`, `user_logged_in`, `user_logged_out`, `passkey_created`

### Onboarding

- `onboarding_started`, `onboarding_step_viewed`, `onboarding_step_completed`, `onboarding_completed`, `onboarding_abandoned`

### Navegación / ciclo

- `dashboard_viewed`, `envelope_opened`, `financial_cycle_started`, `financial_cycle_closed`

### Ingresos / gastos / ahorro

- `income_registered`, `extra_income_registered`, `expense_registered`
- `savings_goal_created`, `savings_contribution_completed`, `additional_savings_added`
- `fixed_commitment_created`, `allocation_modified`

### Coach (renombrados)

- `coach_recommendation_interacted` (antes `coach_action_selected` / eventos coach_* del wizard viejo)
- `crisis_recommendation_resolved` (antes `crisis_action_completed` / `coach_crisis_*`)

### Engagement

- `notification_clicked`, `notification_dismissed`, `weekly_summary_viewed`, `monthly_summary_viewed`, `financial_insight_viewed`

## Duplicados resueltos

| Problema | Resolución |
|----------|------------|
| Onboarding: pasos 1–2 emitían `step_viewed`/`step_completed` y el hook no se usaba | `useOnboardingTracking(step)` en `onboarding-wizard.tsx`; pasos delegan `onStepCompleted` |
| `usePageView` mapeaba `/savings` → `dashboard_viewed` | Eliminado; producto solo vía `track()`; pageviews genéricos con `$pageview` |
| `posthog-setup-report.md` listaba eventos obsoletos (`surplus_moved_to_savings`, `coach_crisis_*`) | Sustituidos por catálogo actual (ver README en `core/analytics/`) |

## Eventos sin call site (pendiente de producto)

| Evento | Motivo |
|--------|--------|
| `notification_clicked` / `notification_dismissed` | No hay UI de notificaciones in-app cableada aún |
| `monthly_summary_viewed` | `/progress` emite solo `weekly_summary_viewed` hoy; falta vista mensual o toggle |

Reservados en tipos para no romper contrato cuando exista la UI.

## Call sites principales (vigentes)

| Evento | Componente |
|--------|------------|
| Auth | `sign-up-view`, `sign-in-view`, `sign-in-passkey-button`, `passkey-setup`, `settings-sign-out-item` |
| Onboarding | `onboarding-wizard` + hook, `step-3-allocation` (`onboarding_completed`) |
| Dashboard | `dashboard-view`, `envelope-cards`, `coach-card` |
| Ingresos | `income-register-form` (+ ciclo via `trackFinancialCycleTransition`) |
| Gastos | `expense-register-form` |
| Ahorro | `new-goal-dialog`, `savings-contribute-button`, `move-surplus-view` |
| Settings | `settings-allocations-editor` |
| Coach | `coach-rescue-confirm-dialog`, `coach-crisis-actions` |
| Progreso | `progress-view` |

## Session replay, heatmaps y autocapture

Configurado en `initPostHog()`:

- `session_recording`: `maskAllInputs`, `[data-ph-mask]`
- `autocapture: true` → rage/dead clicks, scroll, console, network, excepciones JS (según SDK)
- `capture_exceptions: true`
- `capture_pageview: false` + `PostHogPageviewTracker` emite `$pageview` manual por ruta
- CSP en `next.config.ts` permite host PostHog en `connect-src` e `img-src`

## Feature flags (centralizados)

Claves en `FeatureFlags`: `new_onboarding_v2`, `coach_enabled`, `extra_income_enabled`, `adaptive_savings_enabled`, `new_dashboard`, `crisis_coach`, `experimental_insights`.

Hooks: `useFeatureFlag`, `useFeatureFlagVariant`, atajos (`useCoachEnabled`, `useNewOnboardingV2`, etc.).

**Acción en PostHog:** crear los flags en el proyecto `quipu-app` con los mismos keys antes de experimentos.

## Embudo estratégico y retención

Embudo de activación (eventos de producto):

```text
user_signed_up → onboarding_completed → income_registered → expense_registered
```

Retención 7 / 30 días **no** se modela como eventos custom: usar insights de PostHog (retención o `$pageview` / `dashboard_viewed` / `$identify`) con ventanas 7d y 30d. Opcional: cohorte “registró ingreso en semana 1”.

Preguntas de negocio:

| Pregunta | Eventos / enfoque |
|----------|-------------------|
| Abandono onboarding | Funnel `onboarding_started` → steps → `onboarding_abandoned` / `onboarding_completed` |
| % ingresos extraordinarios | Ratio `extra_income_registered` / `income_registered` |
| Ahorro sobre plan | `additional_savings_added`, `savings_contribution_completed` vs allocation en perfil |
| Features y retención | Breakdown por usuarios con `coach_recommendation_interacted`, `savings_*` |
| Activos vs inactivos | Retención sobre `dashboard_viewed` o `$pageview` |

## Expo / React Native

El repo es Next.js web (`posthog-js`). La capa `track()` + tipos es portable; en mobile sustituir `client.ts` por `posthog-react-native` y `client-context.ts` por `Platform.OS`. No duplicar nombres de eventos.

## Tests

`__tests__/analytics.test.ts` — helpers, contrato de eventos, no-op sin env PostHog.

## Próximos pasos recomendados

1. Crear flags y event definitions en PostHog dashboard (aliases legacy si hubo datos viejos).
2. Cablear notificaciones cuando exista UI.
3. Emitir `monthly_summary_viewed` al añadir vista mensual en progreso.
4. Validar en browser: `$pageview`, identify/reset, y un evento por flujo P0.
5. Registrar schemas Zod en `PAYLOAD_SCHEMAS` (`registerPayloadSchema`) para validación dev completa (tabla aún vacía).

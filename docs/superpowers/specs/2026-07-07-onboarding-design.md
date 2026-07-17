# Onboarding v3.0 — Diseño

**Fecha:** 2026-07-17
**Estado:** Implementado
**Diseño visual:** `quipu-2.html` lines 381-635 (Bloque 2 · Onboarding)

## Resumen

Wizard de 3 pasos. El usuario define cómo recibe su dinero, configura su sistema (contextual según su modelo de ingresos), y establece su reparto 50/30/20. Al final ve un resumen de su sistema y entra al dashboard.

### Paso 1 — Perfil: "¿Cómo recibes tu dinero?"
- 3 radio cards: Trabajador dependiente (sueldo fijo) / Trabajador independiente (ingresos variables) / Ingresos mixtos (fijo + variable)
- Mapea a `incomeModel: "fixed" | "variable" | "mixed"`

### Paso 2 — Sistema: Configuración contextual
- **Dependiente:** "¿Cada cuánto te pagan?" — Mensual/Quincenal + día de pago (15, 30, Último) + preview del ciclo
- **Independiente:** "¿Cómo prefieres tus ciclos?" — 15 días o 30 días (campo nuevo `cycleDurationDays`)
- **Mixto:** "Combinemos lo fijo y lo variable" — día de pago parte fija + tags variables

### Paso 3 — Reparto: "¿Cómo repartes lo que entra?"
- Barra segmentada + 3 filas con controles -/+ (5% incrementos)
- Defaults: 50/30/20
- CTA: "Crear mi sistema →" llama a `completeOnboardingAction` → `createProfile`

### Pantalla de éxito
- "Tu sistema está listo" con 3 cards resumen (Perfil, Ciclo, Reparto)
- "Entrar a Quipu →" ejecuta `redirectToDashboard` → `/dashboard`

## Decisiones técnicas

| Decisión | Razón |
|---|---|
| **Sin URL state machine** | Estado interno vía `useState<1\|2\|3\|"success">`. Sin `?step=`, sin `window.history`. Más simple, menos bugs. |
| **3 pasos (no 8)** | Diseño del HTML final. Cada paso responde UNA pregunta. |
| **Sin captura de `name`** | El nombre viene del sign-up (Better Auth). `createProfile` lo toma de `identity.name` como fallback. |
| **Sin paso de compromisos** | Los compromisos fijos se agregan desde el dashboard, no en onboarding. |
| **`cycleDurationDays` en schema** | Campo nuevo (`v.optional(v.number())`) para que variable income elija entre 15 o 30 días de ciclo. |
| **Server action sin commitments bulk** | Solo `createProfile`. Commitments es feature aparte del dashboard. |
| **Persistence sessionStorage** | `OnboardingProvider` hidrata state desde sessionStorage en mount. Refresh preserva el progreso. |
| **React 19 `useTransition`** | Submit de step 3 usa `startTransition` para UI no-bloqueante. |

## Archivos

```
modules/onboarding/
├── components/
│   ├── onboarding-wizard.tsx       # useState<Step> orchestrator
│   ├── onboarding-provider.tsx     # Context + useReducer + sessionStorage
│   ├── onboarding-shell.tsx        # Layout: stepper inline + title + nav
│   ├── step-1-income-profile.tsx   # 3 radio cards
│   ├── step-2-system-config.tsx    # 3 branches: VariableBranch / MixedBranch / FixedBranch
│   ├── step-3-allocation.tsx       # 50/30/20 with -/+ buttons
│   └── step-success.tsx            # Post-submit summary + redirect
├── types.ts
├── constants.ts
├── schemas.ts
├── actions.ts
└── queries.ts

convex/profiles.ts                   # createProfile: name optional, cycleDurationDays
convex/schema.ts                     # profiles.cycleDurationDays field
app/(onboarding)/configurar/page.tsx # simplified, no parseStepId
```

## Flujo de datos

1. Page `/configurar` lee profile Convex. Si existe → redirect `/dashboard`.
2. `<OnboardingWizard>` envuelve `<OnboardingProvider>` que mantiene form state.
3. `WizardInner` usa `useState<Step>` para saber qué step renderizar.
4. Cada step recibe `onNext`/`onBack`/`onComplete` callbacks. NO toca URL.
5. Step 3 submit llama `completeOnboardingAction(state)`.
6. Action valida con `finalPayloadSchema`, llama `api.profiles.createProfile`, redirige `/dashboard` via Server Action native.
7. (Note: redirect desde action solo dispara si el action se invoca sin `useTransition`; con transition el cliente hace el redirect via `onComplete` callback que ejecuta `redirectToDashboard`.)

## Migraciones

- `convex/schema.ts`: agregado `cycleDurationDays: v.optional(v.number())` a tabla `profiles`.
- `convex/profiles.ts`: `name: v.optional(v.string())` en args, fallback a `identity.name` en handler, `cycleDurationDays` en insert.

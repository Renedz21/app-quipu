# Quipu — Tu sueldo, con disciplina.

Quipu es una aplicación web SaaS de disciplina financiera personal dirigida al mercado peruano. No es un rastreador de gastos — es un sistema proactivo de pre-asignación de ingresos basado en economía conductual. El usuario decide a dónde va su dinero **antes** de recibirlo, no después de gastarlo.

---

## Filosofía del producto

La mayoría de apps financieras son reactivas: documentan el desastre después de que ocurre. Quipu actúa antes. El principio central es "págate primero" (*pay yourself first*): el día que llega el sueldo, el dinero se divide automáticamente en tres sobres virtuales antes de que el usuario pueda gastarlo.

La metodología se basa en cuatro pilares de economía conductual:

- **Pre-compromiso:** el usuario decide el destino del dinero en estado racional, no impulsivo
- **Contabilidad mental:** separación visual explícita en sobres (Necesidades, Gustos, Ahorro)
- **Aversión a la pérdida:** cualquier desvío del plan se presenta como una pérdida tangible
- **Reducción de fricción:** cero categorización manual, cero conexión bancaria, cero decisiones repetitivas

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js | 15+ (App Router) |
| UI | React + Tailwind CSS + shadcn/ui | Latest |
| Animaciones | tailwindcss-animate + CSS keyframes | — |
| Base de datos | Convex | Latest |
| Auth | Better Auth | Latest |
| Pagos | Polar.sh | Latest |
| Emails | Resend | Latest |
| Errores | Sentry | Latest |
| Deployment | Vercel | — |

> **No se usa:** Framer Motion / Motion (reemplazado por tailwindcss-animate), integración bancaria (Belvo/Prometeo), React Native.

---

## Estructura de carpetas

```
quipu/
├── app/
│   ├── (auth)/                        # Route group sin layout de dashboard
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/                   # Route group con sidebar y nav
│   │   ├── layout.tsx                 # Layout principal con sidebar
│   │   ├── page.tsx                   # Dashboard principal /
│   │   ├── gastos/
│   │   │   └── page.tsx
│   │   ├── ahorro/
│   │   │   └── page.tsx
│   │   ├── logros/
│   │   │   └── page.tsx
│   │   ├── dia-de-pago/
│   │   │   └── page.tsx
│   │   └── configuracion/
│   │       └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...better-auth]/
│   │   │       └── route.ts            # Handler de Better Auth
│   │   └── webhooks/
│   │       └── polar/
│   │           └── route.ts            # Webhooks de Polar → actualiza plan
│   ├── layout.tsx                      # Root layout, providers, Sentry
│   └── globals.css                     # Tokens OKLCH, variables CSS
│
├── modules/                            # Lógica de negocio por feature
│   ├── auth/
│   │   ├── components/                 # LoginForm, RegisterForm
│   │   ├── hooks/                      # useSession, useUser
│   │   └── actions.ts
│   ├── dashboard/
│   │   ├── components/                 # DashboardHeader, SobresGrid, CoachWidget
│   │   └── hooks/                      # useDashboardData
│   ├── gastos/
│   │   ├── components/                 # GastosList, GastoItem, FiltrosBar
│   │   ├── hooks/                      # useGastos, useRegistrarGasto
│   │   └── actions.ts
│   ├── ahorro/
│   │   ├── components/                 # SobreAhorro, ObjetivoCard, BarraProgreso
│   │   ├── hooks/                      # useAhorro, useObjetivos
│   │   └── actions.ts
│   ├── logros/
│   │   ├── components/                 # BadgeCard, RachaTimeline
│   │   ├── hooks/                      # useLogros, useRacha
│   │   └── actions.ts
│   ├── dia-de-pago/
│   │   ├── components/                 # AsignacionScreen, ConfirmacionModal, CuotasResumen
│   │   ├── hooks/                      # useDiaDePago, useAsignacion
│   │   └── actions.ts
│   ├── rescate/                        # Feature PREMIUM — Modo Rescate
│   │   ├── components/                 # RescateScreen, AccionCard
│   │   └── hooks/                      # useRescate, useDetectarNegativo
│   ├── gratificacion/                  # Feature PREMIUM — Gratificaciones y CTS
│   │   ├── components/                 # GratificacionScreen, AsignacionExtraModal
│   │   └── hooks/                      # useGratificacion
│   └── suscripcion/
│       ├── components/                 # PremiumBanner, UpgradeModal, PricingCard
│       ├── hooks/                      # usePlan, useIsPremium
│       └── actions.ts                  # Crear sesión checkout Polar
│
├── convex/                             # Siempre en root — no mover
│   ├── schema.ts                       # Definición completa de tablas
│   ├── users.ts
│   ├── gastos.ts
│   ├── ahorro.ts
│   ├── logros.ts
│   ├── diaDePago.ts
│   ├── rescate.ts
│   └── _generated/                     # Auto-generado por Convex CLI — no tocar
│
├── core/                               # Global, sin dueño de módulo
│   ├── components/
│   │   ├── ui/                         # Componentes shadcn/ui
│   │   ├── PremiumGuard.tsx            # Wrapper que bloquea features premium
│   │   ├── FloatingButton.tsx          # FAB de registro rápido (todas las pantallas)
│   │   └── Providers.tsx               # ConvexProvider, ThemeProvider, SessionProvider
│   └── hooks/
│       ├── useIsPremium.ts             # Hook global más crítico del sistema
│       └── useToast.ts
│
├── lib/
│   ├── auth.ts                         # Instancia y configuración de Better Auth
│   ├── convex.ts                       # ConvexClient para client components
│   ├── polar.ts                        # Instancia del SDK de Polar
│   ├── sentry.ts                       # Configuración de Sentry
│   └── utils.ts                        # cn(), formatSoles(), calcularAsignacion()
│
├── instrumentation.ts                  # Sentry — requerido por Next.js
├── sentry.client.config.ts
├── sentry.server.config.ts
└── middleware.ts                       # Protección de rutas con Better Auth
```

---

## Schema de Convex

### Modelo de relaciones

```
Better Auth Component (externo)
└── user._id ──→ profiles.userId (v.string(), no v.id())
                      └── expenses.profileId         (v.id("profiles"))
                      └── fixedCommitments.profileId (v.id("profiles"))
                      └── specialIncomes.profileId   (v.id("profiles"))
                      └── savingsSubEnvelopes.profileId
                      └── savingsGoals.profileId
                      └── coachMessages.profileId
                      └── achievements.profileId
                      └── streaks.profileId
                      └── streakMonthlyHistory.profileId
```

> **Regla crítica:** `v.id("tabla")` solo para tablas dentro del propio schema. Para referenciar tablas de componentes externos (Better Auth) siempre usar `v.string()`.

### Campos SaaS en `profiles`

```typescript
plan: v.union(v.literal("free"), v.literal("premium"))
polarSubscriptionId: v.optional(v.string())
polarCustomerId: v.optional(v.string())
planActivatedAt: v.optional(v.number())
```

---

## Módulos y features

### Módulos core (todos los usuarios)

#### Dashboard
- Muestra los tres sobres: Necesidades (50%), Gustos (30%), Ahorro (20%)
- Racha actual con contador de meses consecutivos
- Widget del coach financiero con tip contextual
- Gastos recientes con filtro rápido
- Acceso directo a "Ver detalle de ahorro"

#### Gastos
- Historial completo de transacciones
- Filtros por sobre (Necesidades / Gustos) y rango de fechas
- Totales del período visible

#### Ahorro
- Tres sub-sobres: Fondo de Emergencia, Objetivos a Corto Plazo, Inversión
- Barra de progreso por sub-sobre con porcentaje y monto meta
- El fondo de emergencia tiene fricción deliberada al retirar (confirmación reflexiva)

#### Logros y Rachas
- Timeline de rachas mes a mes (verde = cumplido, gris = no cumplido)
- Badges desbloqueados con fecha de obtención
- Badges por desbloquear como motivación futura
- Un mes es "compliant" si gastos(needs) ≤ asignación(needs) Y gastos(wants) ≤ asignación(wants)

#### Día de Pago
- Pantalla celebratoria cuando llega el día configurado
- Asignación automática del ingreso en los tres sobres
- Descuenta cuotas fijas antes de calcular los porcentajes

#### Registrar Gasto
- FAB flotante en todas las pantallas excepto esta
- Selector de sobre (Necesidades / Gustos) con saldo disponible visible
- Campo de monto numérico
- Descripción opcional
- Máximo 3 segundos para completar el registro

#### Configuración
- Ingreso mensual y día de pago
- Porcentajes del plan (default 50/30/20, editables)
- Cierre de sesión
- Gestión del plan/suscripción

### Features PREMIUM (S/ 14/mes)

#### Modo Rescate
- Se activa automáticamente cuando cualquier sobre entra en negativo
- Pantalla completa (no banner), fondo rojo suave
- Máximo 2 acciones concretas sugeridas ordenadas por impacto
- Ejemplo: "Mover S/ X desde Gustos" o "Pausar contribución a Inversión"
- Después de confirmar: mensaje empático + vuelta al dashboard
- **Este es el feature que convierte:** aparece en el momento de mayor dolor

#### Gratificaciones y CTS
- Detecta ingreso > 1.5x el sueldo mensual configurado
- Pantalla especial celebratoria
- Asignación automática del extra con la misma regla 50/30/20
- Diferenciador único para el mercado peruano (julio, diciembre, CTS)

#### Cuotas y Deudas
- Registro de compromisos fijos mensuales (cuota BCP, tarjeta Ripley, etc.)
- Se descuentan ANTES de calcular los porcentajes del día de pago
- El dashboard muestra el ingreso disponible real, no el bruto
- Indicador en el sobre de Necesidades: "Incluye S/ X en cuotas fijas"

#### Objetivos Personalizados
- Nombre libre + emoji + monto meta + fecha límite
- La app calcula automáticamente el ahorro mensual necesario
- Hasta objetivos ilimitados (free = 1 activo)
- Progreso automático cada día de pago

#### Modo Pareja
- Sobre adicional "Juntos" visible en el dashboard
- Presupuesto compartido con registro de quién hizo cada gasto
- Ambos ven los mismos saldos en tiempo real (Convex)
- No requiere cuenta bancaria real

#### Coach Financiero Diario
- Mensajes proactivos basados en el contexto del usuario
- Free: 1 tip por semana
- Premium: tips diarios personalizados al saldo actual

---

## Modelo SaaS

### Precio y plan

**Un solo plan:** Free + Premium S/ 14/mes (sin plan anual en el lanzamiento)

| | Free | Premium |
|---|---|---|
| Dashboard | ✅ | ✅ |
| Día de pago automático | ✅ | ✅ |
| Gastos | Hasta 20/mes | Ilimitados |
| Objetivo de ahorro | 1 activo | Ilimitados |
| Badges | 3 iniciales | Todos |
| Coach | 1 tip/semana | Diario |
| Modo Rescate | ❌ | ✅ |
| Gratificaciones y CTS | ❌ | ✅ |
| Cuotas y deudas | ❌ | ✅ |
| Modo Pareja | ❌ | ✅ |
| Reportes PDF | ❌ | ✅ |

### Procesador de pagos: Polar.sh

- Fee: ~6% + S/ 1.50 por transacción
- Neto real por usuario: **S/ 11.66/mes**
- Para llegar a S/ 1,500/mes se necesitan **~129 usuarios pagos**
- Polar actúa como Merchant of Record (maneja impuestos globales automáticamente)

> **No usar Culqi para este precio:** su comisión mínima fija de S/ 3.50 representa el 25% del ingreso por transacción a S/ 14.

### Webhooks de Polar (únicos necesarios)

```typescript
// app/api/webhooks/polar/route.ts
subscription.created  → plan = "premium", guardar polarSubscriptionId
subscription.revoked  → plan = "free"
subscription.updated  → sincronizar cambios internos
```

### PremiumGuard — patrón de uso

```typescript
// core/components/PremiumGuard.tsx
const { isPremium } = useIsPremium(); // lee profiles.plan desde Convex
if (!isPremium) return <UpgradeModal />;
return children;

// Uso:
<PremiumGuard>
  <ModoRescate />
</PremiumGuard>
```

---

## Autenticación y flujo de usuario

### Better Auth + Convex

Better Auth corre como componente separado de Convex. Sus tablas (`user`, `session`, `account`, `verification`, `jwks`) viven en el componente de auth, no en el schema principal.

El flujo de conexión es:
```
Better Auth user._id → profiles.userId (v.string()) → profiles._id → resto de tablas
```

### Flujos de navegación

```
Usuario nuevo:
/ (landing) → /register → Onboarding → /dashboard

Usuario existente:
/ (landing) → /login → /dashboard

Usuario con sesión activa:
Cualquier URL → /dashboard directamente
```

### Rutas protegidas (middleware.ts)

```
Protegidas: /dashboard, /gastos, /ahorro, /logros, /dia-de-pago,
            /configuracion, /registrar-gasto
Públicas:   /, /login, /register, /landing

Sin auth → redirect a /
Con auth en /login o /register → redirect a /dashboard
```

### Flag de onboarding

```typescript
profiles.onboardingComplete: boolean
// false → mostrar onboarding post-registro (nombre, sueldo, día de pago)
// true  → ir directo a /dashboard
```

---

## Lógica de negocio central

### Cálculo de asignación (día de pago)

```typescript
// 1. Restar cuotas fijas del ingreso bruto
const disponible = monthlyIncome - sum(fixedCommitments.amount)

// 2. El ahorro se separa primero
const savings = disponible * (allocationSavings / 100)
const needs   = disponible * (allocationNeeds / 100)
const wants   = disponible * (allocationWants / 100)

// 3. Edge case: día 31 en mes con 30 días → usar último día del mes
// 4. Ahorro ACUMULA entre meses. Needs y Wants se RESETEAN cada mes.
// 5. Si hay un ingreso extraordinario → sumar a sobres existentes, no reemplazar
```

### Detección de ingreso extraordinario

```typescript
// Trigger: nuevo ingreso > 1.5x monthlyIncome configurado
// Acción: mostrar GratificacionScreen con asignación 50/30/20 del extra
// Comportamiento: SUMA al saldo existente, no reinicia el mes
```

### Modo Rescate

```typescript
// Trigger: expenses(envelope, mes_actual) > asignacion(envelope)
// Pantalla: fullscreen, no banner ni toast
// Máximo 2 acciones sugeridas, ordenadas por menor impacto en objetivos
// Post-confirmación: revertir a dashboard con mensaje empático
```

### Sistema de rachas

```typescript
// Al cierre de cada mes, evaluar:
const compliant = 
  totalExpenses("needs", mes) <= asignacion("needs") &&
  totalExpenses("wants", mes) <= asignacion("wants")

// Registrar en streakMonthlyHistory
// Si compliant: currentStreak++, actualizar longestStreak si aplica
// Si no compliant: currentStreak = 0
```

---

## Sistema de diseño

### Identidad

- **Nombre:** Quipu (referencia a los registros contables incas)
- **Tagline:** "Tu sueldo, con disciplina."
- **Estilo:** Minimalista premium — referencia: Notion, Linear, Stripe
- **Tipografía:** Sans-serif geométrica, solo pesos regular y semibold
- **Animaciones:** tailwindcss-animate + CSS transitions. Sin Framer Motion.

### Tokens de color (OKLCH)

```css
:root {
  /* Neutrales cálidos — hue 57–84° (tierra, no azul frío) */
  --background:  oklch(0.9789 0.0029 84.56);
  --foreground:  oklch(0.2391 0.0110 57.72);
  --card:        oklch(1.0000 0.0000 0);
  --muted:       oklch(0.9563 0.0035 84.56);
  --border:      oklch(0.9117 0.0083 76.61);

  /* Primary — verde oscuro de marca */
  --primary:          oklch(0.4797 0.0854 164.96);
  --primary-foreground: oklch(0.9789 0.0029 84.56);

  /* Sobres funcionales — chroma alto, distinguibles */
  --envelope-needs:   oklch(0.5488 0.1588 259.57);  /* azul */
  --envelope-wants:   oklch(0.5376 0.1694 304.36);  /* morado */
  --envelope-savings: oklch(0.5965 0.1087 164.62);  /* verde */
  --envelope-juntos:  oklch(0.6084 0.1183 234.60);  /* cyan */

  --destructive: oklch(0.5786 0.2137 27.17);
  --warning:     oklch(0.7325 0.1531 72.24);
  --success:     oklch(0.5965 0.1087 164.62);
}

.dark {
  /* Misma calidez que light, invertida en lightness */
  --background: oklch(0.1420 0.0060 68.00);  /* oscuro cálido, no gris puro */
  --primary:    oklch(0.6800 0.1200 164.96); /* verde más luminoso en dark */
}
```

### Principios de animación

```css
/* Entradas de pantallas y modales */
animate-in fade-in slide-in-from-bottom duration-300

/* Bottom sheet del FAB */
animate-in slide-in-from-bottom duration-300 ease-out

/* Badges al desbloquearse */
animate-in zoom-in-90 fade-in duration-500

/* Hover en tarjetas */
transition-transform duration-150 hover:scale-[1.02]

/* Barras de progreso */
transition-all duration-700 ease-out  /* en el width */
```

---

## Decisiones técnicas

| Decisión | Elección | Razón |
|---|---|---|
| Integración bancaria | ❌ No implementar | Desconfianza del usuario peruano, costo de APIs (Belvo/Prometeo), fricci\u00f3n de onboarding |
| App móvil nativa | ❌ Por ahora no | Sin Mac = sin iOS build. Primero validar negocio en web. |
| React Native | ❌ No | Usar Capacitor cuando haya MRR que lo justifique |
| tRPC vs Convex | Convex | Tiempo real nativo, transaccional, sin infraestructura extra que mantener |
| Stripe vs Polar | Polar | Experiencia previa, SDK oficial para Next.js, maneja impuestos globales como MoR |
| Culqi | ❌ Inviable | Comisión mínima S/ 3.50 = 25% del ingreso a S/ 14/mes |
| Framer Motion | ❌ Reemplazado | 8.4MB para animaciones que Tailwind resuelve nativamente |
| Gráficos de gastos históricos | ❌ No agregar | Contradice la filosofía: macrogestión, no arqueología financiera |
| Subcategorías manuales | ❌ No agregar | Fricción innecesaria. El usuario solo necesita saber cuánto le queda. |
| Plan anual en lanzamiento | ❌ No por ahora | Simplificar decisión del usuario. Agregar cuando haya 200+ pagos. |

---

## Orden de implementación

### Fase 1 — Base funcional
1. Schema Convex completo (`convex/schema.ts`)
2. Better Auth + middleware de rutas protegidas
3. Landing page pública (`/landing`)
4. Onboarding post-registro → crear `profile` en Convex
5. Lógica de día de pago (sin banco, ingreso manual)
6. Registro de gastos + FAB flotante

### Fase 2 — SaaS
7. Integración Polar + webhooks → actualizar `plan` en `profiles`
8. `PremiumGuard` en todos los features premium
9. Modo Rescate
10. Módulo de gratificaciones y CTS

### Fase 3 — Retención
11. Sistema completo de logros y badges
12. Rachas con historial mensual
13. Coach financiero (basado en reglas sobre el contexto del usuario)

### Fase 4 — Crecimiento
14. Modo Pareja
15. Objetivos personalizados con emoji y fecha
16. Reportes mensuales PDF (Resend)

---

## Variables de entorno requeridas

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=

# Better Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# Polar
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=

# Sentry
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

---

## Contexto de mercado

- **País objetivo:** Perú (expansión a Latam en fases posteriores)
- **Usuario objetivo:** persona con sueldo fijo, 22–40 años, que no sabe a dónde va su dinero
- **Diferenciador clave:** único producto que maneja gratificaciones de julio/diciembre y CTS automáticamente
- **Competencia:** Monefy, YNAB, PocketGuard, MonAI — todos son rastreadores reactivos. Quipu es proactivo.
- **Adquisición inicial:** boca a boca → comunidades de finanzas personales en Perú (TikTok, Reddit, Facebook)
- **Meta 6 meses:** 130 usuarios premium = S/ 1,515/mes ingreso neto

---

## Lo que Quipu NO es

- ❌ No es un rastreador de gastos con gráficos
- ❌ No se conecta a tu banco
- ❌ No requiere categorizar cada transacción manualmente
- ❌ No tiene presupuestos flexibles con múltiples métodos
- ❌ No analiza tus patrones de gasto históricos

**Quipu hace una sola cosa excepcionalmente bien: decide a dónde va tu dinero antes de que llegue.**

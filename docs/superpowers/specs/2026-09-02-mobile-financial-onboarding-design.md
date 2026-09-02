# Spec — Onboarding financiero móvil (Intro + Wizard "Tu sistema")

> Fecha: 2026-09-02 · Proyecto Linear: Quipu Mobile (M0 — Cimientos, DEV-1/2/3/4)
> Rama: `feat/mobile-financial-onboarding`
> Fuente de verdad del producto: `apps/web/docs/QUIPU-MASTER.md`
> Antecesor: `2026-09-01-mobile-auth-otp-onboarding-design.md` (auth; definió que el
> país se pide en el registro y el onboarding financiero es el paso siguiente
> "Configurar mi sistema")

## 1. Objetivo

Llevar el onboarding financiero (hoy solo en web) a la app móvil, reutilizando el
backend Convex existente **sin cambios de backend**. Dos bloques:

1. **Intro educativa** (carrusel de 3 pantallas) para usuarios sin sesión.
2. **Wizard "Tu sistema"** (4 pasos + confirmación + éxito) para usuarios con
   sesión y sin profile.

Fuera de alcance: backend nuevo, "Detectar gastos de tu banco" (variante C,
futuro), widget de inicio, cambio de los flows de auth ya implementados.

## 2. Flujo de navegación y gates

Nuevo route group `app/(onboarding)/` (Stack propio, sin tabs).

**Gate client-side `OnboardingGate`** (extiende el `AuthGate` actual, que solo
chequea sesión) consultando `useQuery(api.profiles.getMyProfile)`:

| Estado | Destino |
|---|---|
| Sin sesión | `(auth)/sign-in` |
| Con sesión, sin profile (`null`) | `(onboarding)/sistema` |
| Con sesión, con profile | `(tabs)` |

- `app/_layout.tsx` reemplaza `AuthGate` por `OnboardingGate`.
- La intro solo se muestra cuando no hay sesión; con sesión activa nunca aparece
  (reinstalación → wizard o inicio directamente).
- El botón placeholder "Configurar mi sistema" de `create-account.tsx` pasa a
  navegar a `(onboarding)/sistema`.
- La decisión de gate es client-side (móvil no tiene RSC); `getMyProfile` ya
  existe y es idempotente para este uso.

## 3. Intro educativa

Carrusel horizontal de 3 pantallas (paginador de puntos como el mockup):

1. "Divide tu dinero antes de gastarlo, no después." + quote
   "¿Cuánto puedo gastar hoy sin arruinar mi mes?"
2. "Los tres sobres" — Necesidades 50% / Gustos 30% / Ahorro 20% con barra
   segmentada y copy de cada sobre.
3. "Ciclos y disponible diario" — card "Puedes gastar hoy" (S/ 42.30 estático)
   + reglas del ciclo (gastas de más → mañana baja; de menos → sube; ahorro no
   se toca).

CTAs: "Cómo funciona" (pantalla 1, avanza), "Siguiente" (2), "Crear mi cuenta"
(3) → `(auth)/create-account`; "Ya tengo cuenta" (visible en pantalla 1, bajo el
CTA principal) → `(auth)/sign-in`.

## 4. Wizard "Tu sistema" — pasos

Una sola ruta `app/(onboarding)/sistema.tsx` con pasos internos (patrón del
wizard web: provider + reducer, sin rutas por paso). Header: back + "TU SISTEMA ·
0N/04" en Geist Mono + barras de progreso.

### Paso 01 — ¿Cómo entra tu dinero?

Tarjetas de selección única: **Fijo** / **Variable** / **Mixto** (borde verde +
check en la seleccionada). CTA "Continuar".

### Paso 02 — Configuración según modelo (router)

- **Fijo:** segmented control Mensual / Quincenal / **Semanal** (el backend ya
  soporta `weekly`; la web solo ofrece 2). Input "¿Cuánto sueles recibir?" —
  **solo referencia, no se persiste** (decisión de diseño: opción A). **Sin
  selección de días de pago**: paydays nominales por default — mensual `[1]`,
  quincenal `[15, 30]`, semanal `[1]`. Copy: si el pago real llega antes/después
  (feriados, fines de semana), el ciclo se ajusta automáticamente a la fecha en
  que se registre el ingreso. Preview "Tu ciclo sería 1–30 de cada mes · 30 días".
- **Variable:** duración del ciclo (15 o 30 días) + fuentes de ingreso variable
  (strings, 1–30 chars, igual que web).
- **Mixto:** frecuencia + días no se piden (defaults nominales) + monto fijo de
  referencia + fuentes variables.

### Paso 03 — Cómo se reparte tu sueldo

Sliders Necesidades / Gustos / Ahorro con defaults 50/30/20 (`ALLOCATION_DEFAULTS`),
monto en S/ al lado de cada % (calculado sobre el monto de referencia si existe),
indicador "Suma 100% ✓" forzado, CTA secundario "Volver al 50/30/20 recomendado",
CTA "Continuar".

### Paso 04 — ¿Qué pagas todos los meses?

Compromisos fijos. Entrada rápida por **chips usuales**: + Agua, + Celular, +
Gimnasio, + Streaming, + Otro (pre-cargan el nombre; el usuario edita monto y
día). Lista editable: nombre, monto, "CADA DÍA n" (día del mes), eliminar con X.
Total "Se reserva de Necesidades S/ N". Botón "Después" **debajo de "Continuar"**
omite el paso sin crear compromisos (se agregan después desde Compromisos).

### Confirmación — "Así queda tu ciclo de {mes}"

Card "Podrás gastar al día" = (ingreso de referencia − compromisos − ahorro) ÷
días del ciclo. Desglose: ingreso del ciclo, cada sobre con % y monto,
"Compromisos reservados". Nota: todo editable después desde Ajustes · Tu sistema.
CTA "Empezar mi ciclo" (dispara el submit) + "Ajustar algo" (vuelve al paso 03).

### Éxito — "Tu sistema está listo, {nombre}"

Logo + copy "De aquí en adelante Quipu solo te pide una cosa: registrar lo que
gastas." CTA "Ir a Inicio" → `(tabs)`.

## 5. Estado, lógica pura y envío

**Estado:** contexto + `useReducer` en `modules/onboarding/` (espejo del
provider web: `UPDATE | SET_STEP | RESET`). **Sin persistencia** — el wizard
vive en memoria; si la app muere a mitad, se reinicia (no hay hydration mismatch
que justificar en RN).

**Lógica pura** en `apps/mobile/shared/lib/onboarding/` (opción A: portado, no
package compartido — sigue el patrón de `signup-flow.ts`):

- `buildOnboardingPayload(state)`: portado de
  `apps/web/modules/onboarding/lib/payload.ts` — mergea defaults, resuelve
  mercado desde `currencyCode` (constants de `@quipu/convex-api` o local), 
  strippea `null` (bug QUIPU-APP-1 del original) y filtra campos según
  `incomeModel`. El monto de referencia se excluye del payload.
- `distributeEnvelope` + `ALLOCATION_DEFAULTS`: portado de `lib/allocation.ts`.
- `estimateDailyAvailable({ referenceIncome, commitmentsTotal, allocations, cycleDays })`:
  nuevo, para los previews del paso 02, 03 y confirmación.
- Tests Jest portados/adaptados de `lib/__tests__/payload.test.ts` + nuevos para
  `estimateDailyAvailable`.

**Submit ("Empezar mi ciclo"), en orden:**

1. `useMutation(api.profiles.createProfile)` con el payload final (zod
   `finalPayloadSchema` portado valida antes de enviar; el backend revalida).
2. Con el `profileId` retornado por (1), si hay compromisos:
   `useMutation(api.fixedCommitments.createCommitmentsBulk)` con
   `{ profileId, commitments: [{ name, amount, envelope: "needs", dueDay }] }`
   — monto en céntimos, `dueDay` 1–31; `envelope` siempre `"needs"` en este
   flujo (el mockup reserva de Necesidades; la mutación también acepta
   `"wants"`).
3. → pantalla de éxito → `(tabs)`.

`createProfile` es idempotente (devuelve el `_id` existente si ya hay profile),
por lo que un doble submit no duplica datos. Errores → `ConvexError`
mapeado a mensaje de UI (patrón `setFormError` / `toAppError`).

## 6. UI y convenciones

- Design system móvil existente: tokens `@theme` de `global.css` (light/dark),
  `withUniwind`, fuentes Geist Mono (etiquetas small-caps tipo
  "TU SISTEMA · 01/04"), Hanken (cuerpo), Newsreader (títulos serif del mockup).
- Forms: `@tanstack/react-form` + zod + `validators: { onSubmit }` +
  `revalidateOnBlur` + `setFormError` (patrón del wizard de auth).
- `KeyboardAvoidingView` en pasos con input (02 y 04).
- Estructura feature-first: `apps/mobile/modules/onboarding/` con `components/`
  y componentes de paso; rutas delgadas en `app/(onboarding)/`.
- Dinero en céntimos en toda la lógica; formateo S/ para UI.

## 7. Testing

- **Lógica pura (Jest):** payload builder (portado + adaptado), distribución de
  sobres, suma=100, `estimateDailyAvailable`, defaults de paydays por frecuencia.
- **Componentes (`@testing-library/react-native`):** navegación de pasos del
  wizard, router del paso 02 según modelo, chips del paso 04, gates.
- **Smoke manual:** flujo completo registro → intro → wizard (3 modelos) →
  confirmación → éxito → inicio; reinstalación con sesión activa.

## 8. Criterios de cierre

- [ ] Usuario nuevo: intro → cuenta → wizard → profile creado con allocs correctos
- [ ] Compromisos del paso 04 en `fixedCommitments` (o ninguno con "Después")
- [ ] Usuario con sesión y sin profile cae en el wizard; con profile, en inicio
- [ ] Sin cambios en `apps/web/convex/` (solo consumo desde móvil)
- [ ] `pnpm lint` + `tsc --noEmit` + tests móviles en verde

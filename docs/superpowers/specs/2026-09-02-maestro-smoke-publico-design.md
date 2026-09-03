# Spec — Smoke público E2E móvil con Maestro

> Fecha: 2026-09-02 · Proyecto Linear: Quipu Mobile
> Fuente de verdad del producto: `apps/web/docs/QUIPU-MASTER.md`
> Alcance decidido con el usuario: **A (smoke público, cero dependencias de backend)**

## 1. Objetivo

Primera suite de tests E2E con Maestro para `apps/mobile`, limitada a un **smoke de
las pantallas públicas** alcanzables sin sesión y sin backend:

1. **Intro** — carrusel de 3 pantallas (la app sin sesión cae siempre aquí por el
   `OnboardingGate`).
2. **Sign-in (welcome)** — opciones "Continuar con Passkey" / "Entrar con correo".
3. **Sign-in (email)** — formulario de login con correo y contraseña.
4. **Create account** — primer paso del registro (nombre, email, contraseña).

Fuera de alcance: las 5 tabs (requieren sesión; `OnboardingGate` redirige sin
sesión a `/(onboarding)`), auth real, backend Convex, CI/Maestro Cloud, `testID`s
en la app, subflows/POM. No se toca código de la app salvo un script en
`apps/mobile/package.json`.

## 2. Contexto técnico

- App Expo SDK 57 / RN 0.86, `expo-router`, `expo-dev-client`, package
  `com.quipu.finance` (Android prebuilt en `android/`).
- Sin sesión: `app/_layout.tsx` inicia en `(tabs)`, pero `OnboardingGate`
  redirige a `/(onboarding)` → carrusel de intro. Desde ahí se llega a
  `(auth)/sign-in` ("Ya tengo cuenta") y `(auth)/create-account` ("Crear mi
  cuenta" tras avanzar 2 slides).
- No existen `testID`s en las pantallas públicas (solo `intro-list` y `dot-*` en
  el carrusel). Los selectores usan **texto visible** (best practice de Maestro:
  texto que ve el usuario; el texto de RN se expone al Accessibility Tree).
- El matcher de texto de Maestro es regex de string completo (case-insensitive):
  los textos seleccionados son únicos en pantalla y no colisionan entre sí.

## 3. Workspace de tests

```
apps/mobile/.maestro/
├── config.yaml
└── flows/
    └── smoke/
        ├── 01_intro.yaml
        ├── 02_signin_welcome.yaml
        ├── 03_signin_email.yaml
        └── 04_create_account.yaml
```

**`config.yaml`**:

```yaml
appId: com.quipu.finance
flows:
  - "**"
excludeTags:
  - wip
```

Decisión: workspace en `apps/mobile/.maestro/` (junto a la app) en vez de la
raíz del monorepo, para agrupar `appId` + emulador + flows por app; una futura
suite web tendría su propio `.maestro/` en `apps/web/`.

## 4. Flows (asserts sobre textos verificados en el código)

Todos los flows:

- Header: `appId: com.quipu.finance` + `tags: [smoke]`.
- Comienzan con `launchApp: { clearState: true, stopApp: true }` (aislamiento:
  sin sesión, la app siempre cae al carrusel de intro).
- Selectores por texto visible; sin `inputText` ni envío de formularios (no hay
  backend ni credenciales en este alcance).

### 4.1 `01_intro.yaml` — Carrusel de introducción

Recorre las 3 slides usando los CTAs (más robustos que swipe direccional):

```yaml
---
- launchApp:
    clearState: true
    stopApp: true
- assertVisible: "Divide tu dinero antes de gastarlo, no después."
- tapOn: "Cómo funciona"
- assertVisible: "Todo lo que entra se reparte apenas llega."
- tapOn: "Siguiente"
- assertVisible: "Cada día, un número. Ese es todo el trabajo."
```

### 4.2 `02_signin_welcome.yaml` — Pantalla de bienvenida de sign-in

```yaml
---
- launchApp:
    clearState: true
    stopApp: true
- assertVisible: "Divide tu dinero antes de gastarlo, no después."
- tapOn: "Ya tengo cuenta"
- assertVisible: "Divide tu dinero antes de gastarlo."
- assertVisible: "Continuar con Passkey"
- assertVisible: "Entrar con correo"
- assertVisible: "¿Nuevo en Quipu?"
```

Nota: el título del carrusel ("…, no después.") y el del sign-in (sin el sufijo)
son strings distintos para el matcher de Maestro; no colisionan.

### 4.3 `03_signin_email.yaml` — Vista email del sign-in y vuelta atrás

```yaml
---
- launchApp:
    clearState: true
    stopApp: true
- tapOn: "Ya tengo cuenta"
- tapOn: "Entrar con correo"
- assertVisible: "Entra a tu cuenta."
- assertVisible: "Email"
- assertVisible: "Contraseña"
- assertVisible: "Iniciar sesión"
- back
- assertVisible: "Divide tu dinero antes de gastarlo, no después."
```

Nota: la vista email es un `setView` interno del mismo componente (no una
pantalla de navegación), así que `back` del sistema saca del sign-in al carrusel
de intro (estado predecible); la vuelta al welcome requeriría tocar el icono
ChevronLeft, que no tiene texto (selector frágil), por eso no se hace.

### 4.4 `04_create_account.yaml` — Primer paso del registro

```yaml
---
- launchApp:
    clearState: true
    stopApp: true
- tapOn: "Cómo funciona"
- tapOn: "Siguiente"
- tapOn: "Crear mi cuenta"
- assertVisible: "Crea tu cuenta."
- assertVisible: "CREAR CUENTA · 01/03"
- assertVisible: "Nombre"
- assertVisible: "Email"
- assertVisible: "Contraseña"
- assertVisible: "Continuar"
- back
- assertVisible: "Cada día, un número. Ese es todo el trabajo."
```

## 5. Script npm

En `apps/mobile/package.json` (scripts):

```json
"maestro:smoke": "maestro test --include-tags=smoke .maestro/"
```

## 6. Ejecución y validación

- Dispositivo: emulador Android `Pixel_9_Pro_XL` (el que ve el MCP de Maestro),
  con la **dev build instalada** (`com.quipu.finance`); la instalación se
  documenta en un README del workspace (`.maestro/README.md`) y queda fuera del
  flujo de ejecución: el smoke asume app instalada (decisión A del usuario).
- Primera ejecución vía MCP (`list_devices` → arrancar emulador → `run` con dir
  `apps/mobile/.maestro/flows/smoke`). Ajustar selectores con `inspect_screen`
  si algún texto no coincide con el árbol real (copiar strings verbatim, nunca
  desde screenshot).
- Robustez: assertVisible con reintento automático de Maestro; sin sleeps.
- Criterio de éxito: los 4 flows pasan de principio a fin en el emulador.

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Un texto no está en el Accessibility Tree (e.g. Pressable que agrupa) | `inspect_screen` antes de la ejecución para confirmar los strings; ajustar el selector al árbol real |
| Dev build no instalada / emulador apagado | README con pasos (`npx expo run:android` una vez o EAS); MCP `list_devices` para verificar conexión |
| La app requiere red/backend al arrancar (`ConvexReactClient`) | El smoke valida pantallas públicas que no consultan datos; `useSession` sin backend devuelve sin sesión → carrusel |
| ClearState borra sesión guardada del emulador de desarrollo | Aceptado: es el aislamiento deseado; si molesta al desarrollador, se cambia a `stopApp` en una iteración futura |

## 8. Próximos pasos (fuera de alcance, decisión consciente)

- Smoke de las **5 tabs** con cuenta de test (requiere backend Convex de dev +
  login email/password en el test).
- `testID`s en la app y migración de selectores a IDs cuando la suite crezca.
- Subflows (`open_app.yaml`) + Page Object Model (`elements/*.js`) al superar
  ~5 flows o aparecer selectores técnicos repetidos.
- Maestro Cloud / CI para ejecución en paralelo.

# Smoke Público E2E (Maestro) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el workspace `.maestro/` de `apps/mobile` con 4 flows de smoke público (intro, sign-in welcome, sign-in email, create account) que validan las pantallas sin sesión y sin backend.

**Architecture:** Flows YAML planos por pantalla, selectores por texto visible (la app no tiene `testID`s en estas pantallas), `config.yaml` con `appId: com.quipu.finance` + tags `smoke`, y un script npm `maestro:smoke`. La validación E2E real se hace con el MCP de Maestro contra el emulador `Pixel_9_Pro_XL` una vez que el dispositivo esté conectado.

**Tech Stack:** Maestro CLI (YAML), Expo SDK 57 / React Native (solo lectura para extraer textos), pnpm workspace.

**Spec:** `docs/superpowers/specs/2026-09-02-maestro-smoke-publico-design.md`

## Global Constraints

- **Cero dependencias de entorno**: los flows no requieren backend Convex, credenciales ni red; solo la dev build instalada en el emulador.
- **No tocar código de la app** salvo `apps/mobile/package.json` (script).
- **Selectores por texto visible**, strings copiados verbatim del código fuente (sección §4 de la spec); el matcher de Maestro es regex full-string case-insensitive, así que el string debe ser exacto.
- **Aislamiento**: cada flow arranca con `launchApp: { clearState: true, stopApp: true }` para caer siempre en el carrusel de intro.
- **Tags**: todos los flows llevan `tags: [smoke]`; `config.yaml` excluye `wip` y descubre con `flows: ["**"]`.
- **Idioma**: nombres y labels de los flows en español, consistente con la app.
- **Commits**: por defecto NO se hace ningún commit de git (instrucción del usuario: "no comitees los documentos"); los pasos de commit marcados con ✋ son opcionales y solo se ejecutan si el usuario lo autoriza explícitamente.

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `apps/mobile/.maestro/config.yaml` | `appId`, descubrimiento de flows (`**`), `excludeTags: [wip]` |
| `apps/mobile/.maestro/flows/smoke/01_intro.yaml` | Recorre las 3 slides del carrusel con los CTAs |
| `apps/mobile/.maestro/flows/smoke/02_signin_welcome.yaml` | Navega a sign-in y valida la vista welcome |
| `apps/mobile/.maestro/flows/smoke/03_signin_email.yaml` | Valida la vista email y el back al carrusel |
| `apps/mobile/.maestro/flows/smoke/04_create_account.yaml` | Valida el step 1 del registro y el back |
| `apps/mobile/.maestro/README.md` | Documenta requisitos, instalación del build y ejecución |
| `apps/mobile/package.json` | Añade script `maestro:smoke` |

---

### Task 1: Workspace base (`config.yaml` + README)

**Files:**
- Create: `apps/mobile/.maestro/config.yaml`
- Create: `apps/mobile/.maestro/README.md`

**Interfaces:**
- Consumes: nada.
- Produces: el directorio `.maestro/` con `config.yaml` — base de las Tasks 2–5; el README que explica cómo preparar el emulador (Task 7 la sigue).

- [ ] **Step 1: Crear `apps/mobile/.maestro/config.yaml`**

```yaml
appId: com.quipu.finance
flows:
  - "**"
excludeTags:
  - wip
```

- [ ] **Step 2: Crear `apps/mobile/.maestro/README.md`**

```markdown
# Tests E2E (Maestro) — Quipu Mobile

Smoke público de las pantallas alcanzables sin sesión (intro, sign-in,
create-account). Sin backend ni credenciales.

## Requisitos

- Maestro CLI instalado (`curl -Ls "https://get.maestro.mobile.dev" | bash` o vía
  el canal habitual del equipo; verificar con `maestro --version`).
- Emulador Android `Pixel_9_Pro_XL` arrancado.
- Dev build de la app instalada (package `com.quipu.finance`).

## Instalar la dev build (una vez por build)

Desde `apps/mobile/` (el directorio `android/` ya está prebuilt):

```sh
npx expo run:android
```

Usa el backend Convex que tenía el entorno al compilar (`EXPO_PUBLIC_CONVEX_URL`).
El smoke no lo necesita, pero la app lo carga al arrancar.

## Ejecutar el smoke

```sh
# Desde apps/mobile/
pnpm maestro:smoke

# Equivalente directo
maestro test --include-tags=smoke .maestro/
```

Si un selector no coincide con el árbol real, inspeccionar antes de editar:

```sh
maestro hierarchy
```

>Copia los strings verbatim del árbol de accesibilidad; nunca de un screenshot.
```

- [ ] **Step 3: Verificar estructura creada**

Run: `ls apps/mobile/.maestro apps/mobile/.maestro/flows 2>/dev/null || dir apps\mobile\.maestro apps\mobile\.maestro\flows` (Windows: `dir /b apps\mobile\.maestro`)
Expected: `config.yaml` y `README.md` presentes; `flows/` aún vacío o inexistente (se crea en la Task 2).

- [ ] **Step 4 (✋ opcional): Commit**

```bash
git add apps/mobile/.maestro/config.yaml apps/mobile/.maestro/README.md
git commit -m "feat(mobile): add maestro smoke workspace base"
```

---

### Task 2: Flow `01_intro.yaml` — Carrusel de introducción

**Files:**
- Create: `apps/mobile/.maestro/flows/smoke/01_intro.yaml`

**Interfaces:**
- Consumes: `config.yaml` de la Task 1 (appId del header es redundante pero explícito por convención de Maestro).
- Produces: primer flow `smoke` ejecutable; los textos de slide los reutilizan las Tasks 3 y 5.

- [ ] **Step 1: Crear el flow**

```yaml
appId: com.quipu.finance
tags:
  - smoke
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

- [ ] **Step 2: Validar sintaxis YAML**

Run (desde la raíz del repo, usando el parser que trae el árbol de node_modules):
`node -e "const fs=require('fs'),y=require('js-yaml');y.load(fs.readFileSync('apps/mobile/.maestro/flows/smoke/01_intro.yaml','utf8'));console.log('OK')"` (si `js-yaml` no está disponible, usar el comando de la Task 7, que valida al ejecutar).
Expected: `OK` (o pasar a la validación E2E de la Task 7).

- [ ] **Step 3 (✋ opcional): Commit**

```bash
git add apps/mobile/.maestro/flows/smoke/01_intro.yaml
git commit -m "feat(mobile): add maestro intro smoke flow"
```

---

### Task 3: Flow `02_signin_welcome.yaml` — Bienvenida de sign-in

**Files:**
- Create: `apps/mobile/.maestro/flows/smoke/02_signin_welcome.yaml`

**Interfaces:**
- Consumes: slide 0 del carrusel (Task 2) como punto de partida.
- Produces: el tap en "Entrar con correo" / "Ya tengo cuenta" que la Task 4 encadena.

- [ ] **Step 1: Crear el flow**

```yaml
appId: com.quipu.finance
tags:
  - smoke
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

> Los textos del carrusel ("…, no después.") y del welcome (sin sufijo) son strings distintos para el matcher full-string; se validan con su string exacto.

- [ ] **Step 2: Validar sintaxis YAML** (mismo comando que Task 2, con la ruta de este archivo)
Expected: `OK`

- [ ] **Step 3 (✋ opcional): Commit**

```bash
git add apps/mobile/.maestro/flows/smoke/02_signin_welcome.yaml
git commit -m "feat(mobile): add maestro signin welcome smoke flow"
```

---

### Task 4: Flow `03_signin_email.yaml` — Vista email y back

**Files:**
- Create: `apps/mobile/.maestro/flows/smoke/03_signin_email.yaml`

**Interfaces:**
- Consumes: "Entrar con correo" (pantalla welcome de la Task 3).
- Produces: verificación del back del sistema → carrusel (estado predecible).

- [ ] **Step 1: Crear el flow**

```yaml
appId: com.quipu.finance
tags:
  - smoke
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

> La vista email es un `setView` interno del mismo componente (no hay pantalla de navegación), por lo que `back` del sistema saca del sign-in al carrusel de intro; la vuelta al welcome exigiría tocar el ChevronLeft (sin texto, frágil) — no se hace (spec §4.3).

- [ ] **Step 2: Validar sintaxis YAML** (comando de la Task 2 con esta ruta)
Expected: `OK`

- [ ] **Step 3 (✋ opcional): Commit**

```bash
git add apps/mobile/.maestro/flows/smoke/03_signin_email.yaml
git commit -m "feat(mobile): add maestro signin email smoke flow"
```

---

### Task 5: Flow `04_create_account.yaml` — Primer paso del registro

**Files:**
- Create: `apps/mobile/.maestro/flows/smoke/04_create_account.yaml`

**Interfaces:**
- Consumes: slide 2 del carrusel y su CTA "Crear mi cuenta" (Task 2).
- Produces: verificación de vuelta al carrusel tras `back`.

- [ ] **Step 1: Crear el flow**

```yaml
appId: com.quipu.finance
tags:
  - smoke
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

> El `back` del sistema con `step === 1` ejecuta `router.back()` en `create-account.tsx` → regresa al carrusel en la slide 2 (el FlatList conserva la posición).

- [ ] **Step 2: Validar sintaxis YAML** (comando de la Task 2 con esta ruta)
Expected: `OK`

- [ ] **Step 3 (✋ opcional): Commit**

```bash
git add apps/mobile/.maestro/flows/smoke/04_create_account.yaml
git commit -m "feat(mobile): add maestro create account smoke flow"
```

---

### Task 6: Script `maestro:smoke` en `package.json`

**Files:**
- Modify: `apps/mobile/package.json` (bloque `scripts`, tras `ios`)

**Interfaces:**
- Consumes: `config.yaml` + tags `smoke` (Tasks 1–5).
- Produces: comando documentado en `.maestro/README.md` (Task 1) y usado por la Task 7.

- [ ] **Step 1: Añadir el script**

En `apps/mobile/package.json`, dentro de `"scripts"`, después de la línea `"ios": "expo start:ios",`:

```json
    "ios": "expo start:ios",
    "maestro:smoke": "maestro test --include-tags=smoke .maestro/",
```

- [ ] **Step 2: Verificar que el JSON sigue siendo válido**

Run: `node -e "const p=require('./apps/mobile/package.json');console.log(p.scripts['maestro:smoke'])"` (desde la raíz del repo)
Expected: `maestro test --include-tags=smoke .maestro/`

- [ ] **Step 3 (✋ opcional): Commit**

```bash
git add apps/mobile/package.json
git commit -m "feat(mobile): add maestro smoke npm script"
```

---

### Task 7: Ejecución E2E en el emulador (validación final)

**Files:**
- Ninguno (puede ajustar únicamente los flows de las Tasks 2–5 si el árbol real difiere).

**Interfaces:**
- Consumes: los 4 flows (Tasks 2–5) y el dispositivo del MCP de Maestro.

- [ ] **Step 1: Conectar el emulador**

Ejecutar el MCP `list_devices`; esperado: `Pixel_9_Pro_XL` con `connected: true`. Si está desconectado, pedir al usuario que arranque el emulador (Android Studio / `emulator -avd Pixel_9_Pro_XL`) y que confirme que la dev build (`com.quipu.finance`) está instalada (ver `.maestro/README.md`).

- [ ] **Step 2: Inspeccionar el árbol real (sanity check)**

Ejecutar el MCP `inspect_screen` sobre `Pixel_9_Pro_XL` tras lanzar la app una vez; comparar los strings del carrusel con los de los asserts. Si algún string difiere (p.ej. porque un `Pressable` agrupa el texto), copiar el string verbatim del árbol y actualizar el flow afectado.

- [ ] **Step 3: Ejecutar los 4 flows**

Ejecutar el MCP `run` con `dir: apps/mobile/.maestro/flows/smoke` (o `device_id: Pixel_9_Pro_XL` + `dir` desde la raíz). Esperado: 4/4 PASS.

- [ ] **Step 4: Corregir fallos de selector si los hay**

Si un flow falla, repetir: `inspect_screen` → copiar string exacto → editar el YAML → re-ejecutar solo ese flow con el MCP `run` (`files: [path]`). Repetir hasta 4/4 PASS.

- [ ] **Step 5: Verificación final**

Run (desde `apps/mobile/`): `pnpm maestro:smoke`
Expected: los 4 flows PASS de punta a punta con el comando documentado.

- [ ] **Step 6 (✋ opcional): Commit de ajustes (si hubo)**

```bash
git add apps/mobile/.maestro
git commit -m "fix(mobile): align maestro smoke selectors with accessibility tree"
```

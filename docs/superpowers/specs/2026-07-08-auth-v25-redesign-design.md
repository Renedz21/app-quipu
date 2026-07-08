# Auth v2.5 Redesign — Design Spec

> **For agentic workers:** esta spec define el rediseño de la autenticación para Quipu v2.5 (rama `chore/quipu-2.0`). Su terminación es el `writing-plans` skill, que produce el plan de implementación task-by-task.

**Goal:** Rediseñar las pantallas de autenticación para soportar passkey-first + email/password fallback, separando sign-in y sign-up en rutas distintas, con un solo flujo de éxito por método.

**Architecture:** Server Components para gate de sesión y rendering de status; Client Components solo donde hay estado o eventos (formularios, manejo del prompt de passkey). Wrapper tipado sobre `authClient` traduce errores de Better Auth a `ErrorCode` de `core/errors/index.ts`. Las validaciones de sesión se hacen en `page.tsx` (nunca en `layout.tsx`).

**Tech Stack:** Next.js 16.2 (App Router, RSC) · React 19.2 · Better Auth + `passkeyClient` · `passkeyClient` + `convexClient` de `@convex-dev/better-auth` · TanStack Form (ya en uso) · Tailwind v4 con tokens existentes · vitest.

## Decisiones cerradas (de la sesión de brainstorming)

| # | Decisión | Razón |
|---|---|---|
| 1 | Solo web (no Expo) en este PR | Stack actual es solo web; `expoClient` se agrega cuando haya mobile. |
| 2 | 4 rutas: `sign-in`, `sign-up`, `sign-in/email`, `sign-up/email` | Refleja intención (login vs registro) y método (passkey vs email). URL compartible. Sin tabs. |
| 3 | Post-éxito sign-up: status card → `/onboarding` | Usuario nuevo ve éxito y CTA "Configurar mi ciclo". |
| 4 | Post-éxito sign-in: redirect directo a `/dashboard` o `/onboarding` | Usuario existente NO ve status card. |
| 5 | Status `?status=success` vive en `sign-up/page.tsx` | Un solo query param + render condicional; no necesita ruta propia. |
| 6 | `addPasskey` pre-auth (sin sesión) | Passkey-first registration con `context` opaco. `addPasskey` autenticado se posterga a "Dispositivos de confianza". |
| 7 | Errores de Better Auth → `ErrorCode` mapeados | Regla 4 del AGENTS.md: nunca comparar `error.message` con strings. |
| 8 | Validación de sesión en `page.tsx`, no en `layout.tsx` | `layout.tsx` persiste entre navegaciones; redirects ahí pueden tener efectos no esperados. |
| 9 | Detección de capabilities con `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` | Si retorna `false`, deshabilita botón passkey y promueve link "Usar otro método". |
| 10 | Auth es un módulo (`modules/auth/`), no vive dentro de `app/(auth)/` | El AGENTS.md define `app/` como routing puro y `modules/[x]/` como dominio. `app/(auth)/components/` violaba la regla. |

## Global Constraints

- **`app/` es solo routing.** Sin componentes de dominio. Auth es un dominio → vive en `modules/auth/`. Los route groups `(auth)` y `(app)` organizan rutas, no contienen código de dominio.
- **Regla de 2 niveles** del `AGENTS.md` se aplica a `modules/auth/` también: nada de `modules/auth/components/forms/...`. Si un sub-componente crece, se sube a `shared/` o se parte.
- **Validación de sesión va en `page.tsx`, no en `layout.tsx`.** `layout.tsx` persiste entre navegaciones y un `redirect` ahí causa loops.
- **Componentes reusables cross-module** van a `shared/components/auth/` (status-card, status-icon). El módulo auth solo tiene lo que es suyo.
- **Tokens de color:** usar SOLO las variables existentes en `app/globals.css` (`--primary`, `--primary-soft`, `--success`, `--success-soft`, `--warning`, `--warning-soft`, `--destructive`, `--destructive-soft`, `--paper`, `--foreground`, `--muted-foreground`, `--border`, `--ring`, `--input`). No crear nuevas.
- **Errores tipados:** `ConvexError({ code, message })` con códigos del enum `ErrorCode` en `core/errors/index.ts`. Cliente: `fromConvexError()` y discriminar por `error.code`.
- **Mensajes al usuario en español peruano.**
- **Vitest + `@testing-library/react`** (ya configurados) para tests unitarios.
- **Typecheck y lint** deben pasar antes de cada commit.
- **No usar `useMemo`/`useCallback`/`memo` "por las dudas"** (React Compiler activado, ver `AGENTS.md:214`).
- **Commits separados, no big-bang.** Cada commit deployable.

---

## Arquitectura

### Regla de oro (refuerzo)

**`app/` es solo routing.** Layouts, pages y route handlers — nada más. Ningún componente de dominio vive bajo `app/`. Los route groups (paréntesis) son del router de Next.js, no del dominio.

**`modules/[x]/` es donde vive un dominio.** Auth es un dominio (tiene componentes, acciones, schemas, types), así que vive en `modules/auth/`. Las páginas de `app/(auth)/` solo **componen** los componentes del módulo.

**`shared/` es para reutilizables cross-module.** El `StatusCard` es reutilizable más allá de auth (un día "compra exitosa" en otra feature), así que vive en `shared/components/auth/`, no en `modules/auth/`.

### Estructura de archivos

```
app/
  (auth)/
    layout.tsx                          # SOLO <AuthShell>{children}</AuthShell>. Sin fetches, sin auth, sin redirects.
    sign-in/
      page.tsx                          # server: gate sesión → redirect si logueado. Compone modules/auth/* y shared/components/auth/*.
    sign-up/
      page.tsx                          # server: gate sesión → redirect si logueado. Lee ?status=success y compone StatusCard. Compone modules/auth/* y shared/components/auth/*.
    sign-in/email/
      page.tsx                          # server: gate sesión. Compone modules/auth/email-password-form.
    sign-up/email/
      page.tsx                          # server: gate sesión. Compone modules/auth/email-password-form.

  (app)/
    onboarding/
      page.tsx                          # placeholder (P0-5). Server: gate sesión + gate !profile.
    dashboard/
      page.tsx                          # placeholder (P0-5). Server: gate sesión + gate profile.

modules/
  auth/
    components/
      auth-shell.tsx                    # server component: chrome (logo + fondo --paper). Sin estado.
      passkey-prompt-button.tsx         # client: detecta capabilities + maneja el flujo passkey.
      email-password-form.tsx           # client: maneja signIn.email() / signUp.email().
      status-state.tsx                  # client: hook que lee ?status=... de searchParams y devuelve la variante del card.
      passkey-prompt-button.test.tsx
      email-password-form.test.tsx
    actions.ts                          # server actions tipadas si se necesita (opcional).
    schemas.ts                          # Zod schemas para signIn/signUp.
    types.ts                            # view models (AuthStatus, PasskeyResult, etc.).
    constants.ts                        # mensajes en español.
    errorMap.ts                         # tabla de mapeo Better Auth → ErrorCode.
    errorMap.test.ts                    # vitest.
    passkey.ts                          # MODIFICAR: wrappers tipados con ErrorCode (movido desde auth/passkey.ts).
    emailPassword.ts                    # NUEVO.

shared/
  components/
    auth/
      status-card.tsx                   # server: card con status-icon + título + descripción + acción.
      status-icon.tsx                   # server: círculo con check o X, color por variant.
      status-card.test.tsx
      status-icon.test.tsx

auth/
  auth-client.ts                        # sin cambios.
  auth-server.ts                        # MODIFICAR: agregar requireUnauthenticatedSession() (server-only, se usa desde page.tsx, NO desde layout.tsx).
  passkey.ts                            # QUEDA hasta el commit 5. La página sign-in vieja lo usa. El commit 5 lo borra.

convex/
  auth.ts                               # sin cambios.
  profiles.ts                           # sin cambios (la query getMyProfile ya existe).

core/
  errors/
    index.ts                            # AGREGAR nuevos ErrorCode (ver tabla de mapeo abajo).

docs/
  auth-smoke.md                         # NUEVO: checklist de smoke test manual reproducible.
```

### Flujos

#### 1) Sign-in con passkey (exitoso, usuario existente con profile)
```
sign-in/page.tsx
  → cliente: passkey-prompt-button.click
    → useEffect al montar: isUserVerifyingPlatformAuthenticatorAvailable() → true
    → useEffect: pre-load autofill con signIn.passkey({ autoFill: true })
    → onSubmit: signIn.passkey({ autoFill: false })
  → success → server action decide:
    → fetchAuthQuery(api.profiles.getMyProfile, {})
      → si profile existe → redirect("/dashboard")
      → si null → redirect("/onboarding")
```

#### 2) Sign-up con passkey (exitoso, usuario nuevo)
```
sign-up/page.tsx
  → cliente: passkey-prompt-button.click
    → onSubmit: authClient.passkey.addPasskey({ name: email, context: email })
      → resolveUser en convex/auth.ts crea el user si no existe
  → success → server action:
    → fetchAuthQuery(api.profiles.getMyProfile, {})
      → null (acaba de crearse) → redirect("/sign-up?status=success")
sign-up/page.tsx (con ?status=success)
  → renderiza <StatusCard variant="success" title="¡Listo, Lucía!" ... />
  → CTA: "Configurar mi ciclo" → redirect("/onboarding")
```

#### 3) Sign-in email/password (fallback)
```
sign-in/email/page.tsx
  → cliente: email-password-form (mode="signIn")
    → onSubmit: authClient.signIn.email({ email, password })
  → success → server action:
    → fetchAuthQuery(api.profiles.getMyProfile, {})
      → si profile existe → redirect("/dashboard")
      → si null → redirect("/onboarding")
```

#### 4) Sign-up email/password
```
sign-up/email/page.tsx
  → cliente: email-password-form (mode="signUp")
    → onSubmit: authClient.signUp.email({ email, password, name: email.split("@")[0] })
  → success → server action:
    → fetchAuthQuery(api.profiles.getMyProfile, {})
      → null → redirect("/sign-up?status=success")
```

#### 5) Error de passkey
```
cualquier flujo passkey fallido
  → error.code mapeado en modules/auth/errorMap.ts
  → sign-in/page.tsx lee ?error=CODE y renderiza <StatusCard variant="error" ... />
  → botones: "Reintentar" (limpia ?error) y "Usar otro método" (link a /sign-in/email)
```

### Validación de sesión: gate en `page.tsx`, NO en `layout.tsx`

**Razón:** `layout.tsx` persiste entre navegaciones de segmentos hijos. Un `redirect` en layout causa comportamiento no deseado (no se desmonta el árbol actual, y la siguiente navegación puede volver a evaluarlo, generando loops). El gate debe estar en cada `page.tsx` de las rutas auth, idealmente como un helper `requireUnauthenticatedSession()` o un `requireAuthenticatedSession()` en `auth/auth-server.ts`.

```ts
// auth/auth-server.ts — agregar helpers (NO usar en layout.tsx)
export async function requireUnauthenticatedSession() {
  const isAuthed = await isAuthenticated();
  if (isAuthed) {
    // Decidir destino según profile
    const profile = await fetchAuthQuery(api.profiles.getMyProfile, {});
    if (profile) redirect("/dashboard");
    redirect("/onboarding");
  }
}
```

Cada `page.tsx` llama `await requireUnauthenticatedSession()` como primera línea. Esto se ejecuta en el server y `redirect` corta la renderización.

### Detección de capabilities

```ts
// modules/auth/components/passkey-prompt-button.tsx
"use client";

const [hasPlatformAuth, setHasPlatformAuth] = useState<boolean | null>(null);

useEffect(() => {
  if (typeof window === "undefined" || !window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) {
    setHasPlatformAuth(false);
    return;
  }
  PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    .then(setHasPlatformAuth)
    .catch(() => setHasPlatformAuth(false));
}, []);

// Render:
// - hasPlatformAuth === null: skeleton neutro
// - hasPlatformAuth === false: botón deshabilitado + "Tu dispositivo no soporta Passkeys" + link a /sign-in/email como CTA principal
// - hasPlatformAuth === true: botón activo + "Usar otro método" como link secundario
```

**Importante:** el link "Usar otro método" se renderiza **siempre**, no solo cuando la detección falla. Así un usuario con passkey puede decidir voluntariamente usar email (ej. laptop del trabajo).

---

## Componentes reusables

### `shared/components/auth/status-card.tsx`

```ts
type StatusVariant = "success" | "error" | "verify-error" | "network-error" | "expired-error";

interface StatusCardProps {
  variant: StatusVariant;
  title: string;
  description: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
}
```

Tokens de color por variant:
- `success` → `--success-soft` (fondo del icon circle), `--success` (icon color)
- `error`, `verify-error`, `expired-error` → `--destructive-soft` + `--destructive`
- `network-error` → `--warning-soft` + `--warning` (es un caso aparte, amarillo)

El card en sí usa `--background` (default) o `--card` si está sobre un fondo `--paper`. Padding y border radius de `Card` primitives ya existentes.

### `shared/components/auth/status-icon.tsx`

```ts
interface StatusIconProps {
  variant: StatusVariant;
  size?: "default" | "sm";  // default: w-16 h-16; sm: w-10 h-10
}
```

Renderiza un círculo con el ícono de `lucide-react` (`Check`, `X`, `WifiOff`). Animación de entrada: `motion-safe:animate-in fade-in zoom-in-95`. Respeta `prefers-reduced-motion` (sin animación si está activo).

---

## Errores tipados

### Tabla de mapeo Better Auth → ErrorCode

| `error.code` (Better Auth) | `ErrorCode` (Quipu) | Mensaje al usuario | Variante del card |
|---|---|---|---|
| `SECURITY_ERROR` / `security_error` | `AUTH_PASSKEY_SECURITY_ERROR` | "No pudimos verificarte. La verificación con Passkey se canceló o expiró." | `verify-error` |
| `NETWORK_ERROR` / `network_error` | `AUTH_PASSKEY_NETWORK_ERROR` | "Sin conexión. Revisa tu internet e intenta de nuevo." | `network-error` |
| `INVALID_CHALLENGE` | `AUTH_PASSKEY_EXPIRED` | "La verificación expiró. Intenta de nuevo." | `expired-error` |
| `USER_CANCELLED` / `NotAllowedError` | (no error, no card) | — | — |
| `USER_NOT_FOUND` | `AUTH_USER_NOT_FOUND` | "No encontramos una cuenta con ese correo." | `error` |
| `INVALID_EMAIL` / `INVALID_PASSWORD` | `AUTH_INVALID_CREDENTIALS` | "Correo o contraseña incorrectos." | `error` |
| `EMAIL_ALREADY_EXISTS` | `AUTH_EMAIL_TAKEN` | "Ya existe una cuenta con ese correo. Inicia sesión." | `error` |
| (cualquier otro) | `AUTH_UNKNOWN_ERROR` | "Algo salió mal. Intenta de nuevo." | `error` |

### `modules/auth/passkey.ts` (versión nueva — movido desde `auth/passkey.ts`)

```ts
import { authClient } from "@/auth/auth-client";
import { mapBetterAuthError } from "./errorMap";  // tabla de arriba

export type PasskeyResult<T> =
  | { data: T; error: null }
  | { data: null; error: { code: ErrorCode; message: string } };

export async function registerPasskey({
  name,
  context,
}: {
  name?: string;
  context?: string;
}): Promise<PasskeyResult<unknown>> {
  const result = await authClient.passkey.addPasskey({ name, context });
  if (result.error) {
    return { data: null, error: mapBetterAuthError(result.error.code) };
  }
  return { data: result.data, error: null };
}

export async function signInWithPasskey(autoFill = true): Promise<PasskeyResult<unknown>> {
  const result = await authClient.signIn.passkey({ autoFill });
  if (result.error) {
    return { data: null, error: mapBetterAuthError(result.error.code) };
  }
  return { data: result.data, error: null };
}
```

### `auth/emailPassword.ts` (NUEVO)

Misma forma que `passkey.ts` pero para `authClient.signIn.email()` y `authClient.signUp.email()`. Misma tabla de mapeo.

### `core/errors/index.ts` — agregar códigos

```ts
export const ErrorCode = {
  // ... existentes
  AUTH_PASSKEY_SECURITY_ERROR: "AUTH_PASSKEY_SECURITY_ERROR",
  AUTH_PASSKEY_NETWORK_ERROR: "AUTH_PASSKEY_NETWORK_ERROR",
  AUTH_PASSKEY_EXPIRED: "AUTH_PASSKEY_EXPIRED",
  AUTH_USER_NOT_FOUND: "AUTH_USER_NOT_FOUND",
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_EMAIL_TAKEN: "AUTH_EMAIL_TAKEN",
  AUTH_UNKNOWN_ERROR: "AUTH_UNKNOWN_ERROR",
} as const;
```

---

## Testing

### Unit (vitest)

1. `modules/auth/errorMap.test.ts` — Tabla completa de pairs (input code → output ErrorCode + message).
2. `modules/auth/components/passkey-prompt-button.test.tsx` — Mockear `window.PublicKeyCredential`:
   - Caso `isUserVerifyingPlatformAuthenticatorAvailable` retorna `true` → botón habilitado, link secundario visible.
   - Caso retorna `false` → botón deshabilitado, link a `/sign-in/email` como CTA principal.
   - Caso `window.PublicKeyCredential` undefined → mismo que `false`.
3. `modules/auth/components/email-password-form.test.tsx` — Mockear `authClient.signIn.email`:
   - Submit válido → llama `signIn.email` con los argumentos correctos.
   - Error de Better Auth → muestra mensaje mapeado en el card.
4. `shared/components/auth/status-card.test.tsx` — Renderiza cada variant con título, descripción y acciones correctas.
5. `shared/components/auth/status-icon.test.tsx` — Cada variant usa el color token correcto y el ícono correcto.

### Integration manual (smoke test reproducible)

`docs/auth-smoke.md`:

```markdown
# Auth Smoke Test — Quipu v2.5

## Pre-requisitos
- `npx convex dev` corriendo.
- `pnpm dev` corriendo.
- Browser: Chrome estable (para WebAuthn) + Safari (passkey de iCloud Keychain) + un browser sin passkey (Firefox).
- Cuenta de prueba limpia (borrar el user de Better Auth entre runs).

## Casos

### A. Sign-up con passkey (nuevo usuario)
1. Ir a `/sign-up`.
2. Tipear email nuevo `test-A@quipu.pe` y click "Crear con Passkey".
3. Autorizar passkey con Touch ID / Windows Hello.
4. Aparece status card verde "¡Listo, Lucía!" con CTA "Configurar mi ciclo".
5. Click CTA → aterriza en `/onboarding` (placeholder, P0-5).
6. ✅ Esperado: status card visible, redirect a /onboarding, sesión activa.

### B. Sign-in con passkey (usuario existente con profile)
1. (Pre-condición: usuario A ya completó P0-2 onboarding en una sesión previa.)
2. Logout (limpiar cookies).
3. Ir a `/sign-in`.
4. Click "Iniciar sesión con Passkey".
5. Autorizar passkey.
6. Redirect directo a `/dashboard` (sin status card).
7. ✅ Esperado: sesión activa, sin status card, aterriza en dashboard.

### C. Sign-in con email/password (fallback)
1. Ir a `/sign-in`.
2. Click "Usar otro método" → aterriza en `/sign-in/email`.
3. Tipear email y password de un usuario existente.
4. Redirect a `/dashboard` o `/onboarding` según profile.
5. ✅ Esperado: redirect correcto, sesión activa.

### D. Sign-up con email/password
1. Ir a `/sign-up`.
2. Click "Usar otro método" → aterriza en `/sign-up/email`.
3. Tipear email nuevo + password (8+ chars).
4. Status card verde aparece.
5. CTA "Configurar mi ciclo" → `/onboarding`.
6. ✅ Esperado: cuenta creada, status card visible, redirect a onboarding.

### E. Error de passkey cancelado
1. Ir a `/sign-in`.
2. Click "Iniciar sesión con Passkey".
3. Cancelar el prompt del OS.
4. Vuelve a la pantalla de sign-in sin mensaje (USER_CANCELLED no se muestra).
5. ✅ Esperado: sin error visible, foco vuelve al botón.

### F. Error de passkey expirado
1. (Provocar con un challenge viejo: o saltear el test si es difícil de reproducir manualmente.)
2. ✅ Esperado: status card `expired-error` con "Reintentar" y "Usar otro método".

### G. Browser sin passkeys
1. Abrir `/sign-in` en Firefox.
2. Botón "Iniciar sesión con Passkey" deshabilitado con copy secundario.
3. CTA principal es "Usar otro método" → `/sign-in/email`.
4. ✅ Esperado: passkey no ofrecida, email es la ruta por defecto.

### H. Sesión ya activa (deep link)
1. Logueado, ir manualmente a `/sign-in` (URL pegada en barra).
2. Redirect a `/dashboard` o `/onboarding` según profile.
3. ✅ Esperado: nunca ve el form si ya está logueado.
```

---

## Plan de commits (deployables independientes)

1. **`chore(auth): add error map and ErrorCode entries`**
   - `core/errors/index.ts`: agregar nuevos códigos (`AUTH_PASSKEY_*`, `AUTH_USER_NOT_FOUND`, `AUTH_INVALID_CREDENTIALS`, `AUTH_EMAIL_TAKEN`, `AUTH_UNKNOWN_ERROR`).
   - `modules/auth/errorMap.ts`: tabla de mapeo.
   - `modules/auth/errorMap.test.ts`: tests de la tabla.
   - `modules/auth/types.ts`: `PasskeyResult`, `AuthStatus`, `StatusVariant`.
   - `modules/auth/passkey.ts`: mover desde `auth/passkey.ts` y reescribir con tipado.
   - `modules/auth/emailPassword.ts`: nuevo.
   - **Verificación:** vitest pasa, typecheck pasa. La app sigue funcionando porque `auth/passkey.ts` viejo NO se toca en este commit (se borra en el commit 5). Los wrappers nuevos conviven con los viejos hasta que las páginas nuevas se introduzcan en el commit 4.

2. **`feat(auth): add status card components`**
   - `shared/components/auth/status-card.tsx`.
   - `shared/components/auth/status-icon.tsx`.
   - `shared/components/auth/status-card.test.tsx`.
   - `shared/components/auth/status-icon.test.tsx`.
   - **Verificación:** vitest pasa, typecheck pasa. La app no se ve afectada.

3. **`feat(auth): add modules/auth components`**
   - `modules/auth/components/auth-shell.tsx`.
   - `modules/auth/components/passkey-prompt-button.tsx`.
   - `modules/auth/components/passkey-prompt-button.test.tsx`.
   - `modules/auth/components/email-password-form.tsx`.
   - `modules/auth/components/email-password-form.test.tsx`.
   - `modules/auth/components/status-state.tsx` (hook que lee searchParams).
   - `modules/auth/schemas.ts`: Zod para signIn/signUp.
   - `modules/auth/constants.ts`: mensajes en español.
   - **Verificación:** vitest pasa, typecheck pasa. La app no se ve afectada (las páginas todavía no se introducen).

4. **`feat(auth): add new sign-in and sign-up routes`**
   - `app/(auth)/layout.tsx`: solo `<AuthShell>{children}</AuthShell>`.
   - `app/(auth)/sign-in/page.tsx` (nueva, server component con gate).
   - `app/(auth)/sign-up/page.tsx` (nueva, server component con gate + status condicional).
   - `app/(auth)/sign-in/email/page.tsx` (nueva).
   - `app/(auth)/sign-up/email/page.tsx` (nueva).
   - `auth/auth-server.ts`: agregar `requireUnauthenticatedSession()`.
   - `app/(app)/onboarding/page.tsx` (placeholder, P0-5).
   - `app/(app)/dashboard/page.tsx` (placeholder, P0-5).
   - `app/(app)/layout.tsx` (placeholder shell).
   - `docs/auth-smoke.md`: checklist.
   - **Verificación:** vitest pasa, typecheck pasa, smoke test del navegador (los 8 casos del Anexo).

5. **`chore(auth): remove old sign-in page`**
   - Borrar `app/(auth)/sign-in/page.tsx` VIEJO.
   - Borrar `auth/passkey.ts` (movido a `modules/auth/passkey.ts`).
   - `app/page.tsx`: borrar contenido de Next.js demo, dejarlo en `redirect("/sign-in")`.
   - **Verificación:** typecheck, smoke test que el home redirige.

6. **`docs: update AGENTS.md and CLAUDE.md with auth v2.5 rules`**
   - Agregar nota: "Las páginas de auth no usan tabs — la ruta refleja intención y método."
   - Agregar nota: "Validaciones de sesión van en `page.tsx`, no en `layout.tsx`."
   - Agregar nota: "Auth es un módulo (`modules/auth/`), no vive dentro de `app/(auth)/`."
   - **Verificación:** docs consistentes.

---

## Riesgos y mitigaciones

| # | Riesgo | Mitigación |
|---|---|---|
| 1 | Doble signup con mismo email (passkey + email/password crean cuentas separadas) | Verificar que el `resolveUser` en `convex/auth.ts` reutilice el user por email. Si no lo hace, abrir issue P2-4. |
| 2 | `PublicKeyCredential` no existe en SSR | Todas las llamadas a `window.PublicKeyCredential` dentro de `useEffect` o tras un guard `typeof window !== "undefined"`. |
| 3 | Autofill de Chrome dispara prompt en sign-up (donde no hay passkey) | En `sign-up/page.tsx` y `sign-up/email/page.tsx`, los inputs NO tienen `autocomplete="... webauthn"`. Solo `sign-in/page.tsx` lo tiene. |
| 4 | Rate limiting de Better Auth no es suficiente | Verificar defaults; si la app es pública, evaluar agregar rate limit por email. P2. |
| 5 | Si `/onboarding` y `/dashboard` no existen (P0-5), el smoke test del paso 4 falla | Hacer P0-5 ANTES del paso 4 de este spec. O al menos antes del merge a main. |
| 6 | Tokens de color nuevos "tentadores" en un PR grande | Lint rule ad-hoc en el PR review. No crear CI rule por ahora (P2 si aparece el problema). |
| 7 | El wrapper tipado cambia la forma de retorno de `auth/passkey.ts` → rompe consumidores | Secuencia: commit 1 crea `modules/auth/passkey.ts` (nueva forma) **sin tocar** `auth/passkey.ts` viejo. Commit 4 introduce las páginas nuevas que importan de `modules/auth/`. Commit 5 borra la página vieja (que importaba de `auth/passkey.ts` viejo) y luego borra `auth/passkey.ts`. Entre los commits 1–4 conviven dos versiones; no se rompen consumers. |

---

## Out of scope (para que quede explícito)

- Onboarding v2.5 completo (P0-2 del living doc). Solo se necesita la ruta placeholder de P0-5.
- Dashboard real (otra historia). Solo se necesita la ruta placeholder de P0-5.
- Recovery / forgot password (decisión 2 del usuario: "al final de toda la plataforma").
- 2FA, magic link, otros métodos de auth.
- Multi-dispositivo: registrar segunda passkey con sesión activa (postergado a "Dispositivos de confianza").
- Cambios al modelo de `convex/auth.ts`. Se queda como está.
- Migración de la v1 de usuarios con `account.providerId = "credential"`. Asumimos que el seed de dev ya está limpio; los usuarios viejos usarán el fallback email/password, que ya está habilitado.
- A11y audit profundo (focus trap en modales, ARIA, axe). El smoke test valida que el flujo funciona; un audit real va aparte.
- E2E con Playwright. No hay infraestructura; P2 si se quiere.

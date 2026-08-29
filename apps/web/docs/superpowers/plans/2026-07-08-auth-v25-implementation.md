# Auth v2.5 Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar las pantallas de autenticación de Quipu para soportar passkey-first + email/password fallback, separando sign-in y sign-up en rutas distintas, con un solo flujo de éxito por método y un dominio auth en `modules/auth/`.

**Architecture:** Server Components para gate de sesión y rendering de status; Client Components solo donde hay estado o eventos. Wrapper tipado sobre `authClient` traduce errores de Better Auth a `ErrorCode` de `core/errors/index.ts`. Las validaciones de sesión van en `page.tsx` (nunca en `layout.tsx`). Auth es un módulo de dominio (`modules/auth/`); `app/(auth)/` es solo routing.

**Tech Stack:** Next.js 16.2 (App Router, RSC) · React 19.2 · Better Auth + `passkeyClient` · `@convex-dev/better-auth` · TanStack Form (en `app/(auth)/sign-in/page.tsx` actual) · Tailwind v4 con tokens existentes en `app/globals.css` · vitest + jsdom + `@vitejs/plugin-react` · Biome 2.5 (lint/format).

## Global Constraints

- `app/` es SOLO routing. Sin componentes de dominio. Auth es un módulo (`modules/auth/`). Los route groups `(auth)` y `(app)` organizan rutas, no contienen código de dominio.
- Regla de 2 niveles del `AGENTS.md` se aplica a `modules/auth/` también: nada de `modules/auth/components/forms/...`. Si un sub-componente crece, se sube a `shared/` o se parte.
- Validación de sesión va en `page.tsx`, no en `layout.tsx`. `layout.tsx` persiste entre navegaciones y un `redirect` ahí causa loops.
- Componentes reusables cross-module van a `shared/components/auth/` (status-card, status-icon). El módulo auth solo tiene lo que es suyo.
- Tokens de color: usar SOLO las variables existentes en `app/globals.css` (`--primary`, `--primary-soft`, `--success`, `--success-soft`, `--warning`, `--warning-soft`, `--destructive`, `--destructive-soft`, `--paper`, `--foreground`, `--muted-foreground`, `--border`, `--ring`, `--input`). NO crear nuevas.
- Errores tipados: `ConvexError({ code, message })` con códigos del union `ErrorCode` en `core/errors/index.ts`. Cliente: `fromConvexError()` y discriminar por `error.code`.
- Mensajes al usuario en español peruano.
- Vitest + `@testing-library/react` para tests unitarios. Pattern: `import { describe, expect, it } from "vitest";`.
- Typecheck (`pnpm tsc --noEmit`) y lint (`pnpm lint`) deben pasar antes de cada commit.
- No usar `useMemo`/`useCallback`/`memo` "por las dudas" (React Compiler activado, ver `AGENTS.md:214`).
- Commits separados, no big-bang. Cada commit deployable. 6 commits en total.
- 2 espacios de indentación (Biome formatter). Comillas dobles en TS/TSX (Biome default).
- `package.json` ya tiene: `vitest`, `@vitejs/plugin-react`, `vite-tsconfig-paths`, `convex`, `better-auth`, `@better-auth/passkey`, `@convex-dev/better-auth`, `lucide-react`, `tailwindcss`, `zod`, `next`, `react@19.2.4`. No agregar dependencias nuevas.
- `convex/profiles.getMyProfile` ya existe y retorna `null` si no hay profile. Se consume vía `fetchAuthQuery(api.profiles.getMyProfile, {})`.
- Mejor Auth ya configurado: `authClient.passkey.addPasskey({ name, context })` con `requireSession: false`. `authClient.signIn.passkey({ autoFill })`. `authClient.signIn.email({ email, password })`. `authClient.signUp.email({ email, password, name })`. `autoSignIn: true` está activo en `emailAndPassword`, así que `signUp.email` setea sesión automáticamente.
- `auth/passkey.ts` (versión vieja) se BORRA en el commit 5. Los commits 1-4 no lo tocan para mantener compat con la página vieja.

---

## File Structure (resumen, autoritativo)

**Nuevos:**
- `app/(auth)/layout.tsx` (modificado, era el demo layout)
- `app/(auth)/sign-in/page.tsx`
- `app/(auth)/sign-up/page.tsx`
- `app/(auth)/sign-in/email/page.tsx`
- `app/(auth)/sign-up/email/page.tsx`
- `app/(app)/layout.tsx`
- `app/(app)/onboarding/page.tsx`
- `app/(app)/dashboard/page.tsx`
- `modules/auth/components/auth-shell.tsx`
- `modules/auth/components/passkey-prompt-button.tsx`
- `modules/auth/components/email-password-form.tsx`
- `modules/auth/components/status-state.tsx`
- `modules/auth/components/passkey-prompt-button.test.tsx`
- `modules/auth/components/email-password-form.test.tsx`
- `modules/auth/actions.ts`
- `modules/auth/schemas.ts`
- `modules/auth/types.ts`
- `modules/auth/constants.ts`
- `modules/auth/errorMap.ts`
- `modules/auth/errorMap.test.ts`
- `modules/auth/passkey.ts` (movido desde `auth/passkey.ts`, reescrito con tipado)
- `modules/auth/emailPassword.ts`
- `shared/components/auth/status-card.tsx`
- `shared/components/auth/status-icon.tsx`
- `shared/components/auth/status-card.test.tsx`
- `shared/components/auth/status-icon.test.tsx`
- `docs/auth-smoke.md`

**Modificados:**
- `app/page.tsx` (borrar demo, dejar `redirect("/sign-in")`)
- `core/errors/index.ts` (agregar nuevos `ErrorCode`)
- `auth/auth-server.ts` (agregar `requireUnauthenticatedSession()`)
- `AGENTS.md` (agregar reglas de auth)
- `CLAUDE.md` (agregar reglas de auth)

**Borrados (commit 5):**
- `app/(auth)/sign-in/page.tsx` (versión vieja)
- `auth/passkey.ts` (movido a `modules/auth/passkey.ts`)

---

## Task 1: Add new ErrorCode entries

**Files:**
- Modify: `core/errors/index.ts:14-34`

**Interfaces:**
- Consumes: nada
- Produces: nuevos union members en `ErrorCode`: `AUTH_PASSKEY_SECURITY_ERROR`, `AUTH_PASSKEY_NETWORK_ERROR`, `AUTH_PASSKEY_EXPIRED`, `AUTH_USER_NOT_FOUND`, `AUTH_INVALID_CREDENTIALS`, `AUTH_EMAIL_TAKEN`, `AUTH_UNKNOWN_ERROR`. Tests de la tarea 2 dependen de estos codes.

- [ ] **Step 1: Edit `core/errors/index.ts` para agregar los nuevos codes**

Reemplaza el bloque del union `ErrorCode` (líneas 14-34) con:

```ts
export type ErrorCode =
  // Auth
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "SESSION_EXPIRED"
  | "AUTH_PASSKEY_SECURITY_ERROR"
  | "AUTH_PASSKEY_NETWORK_ERROR"
  | "AUTH_PASSKEY_EXPIRED"
  | "AUTH_USER_NOT_FOUND"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_EMAIL_TAKEN"
  | "AUTH_UNKNOWN_ERROR"
  // Validación
  | "VALIDATION_ERROR"
  | "INVALID_INPUT"
  // Recurso
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "CONFLICT"
  // Regla de negocio
  | "NO_ACTIVE_CYCLE"
  | "CYCLE_ALREADY_CLOSED"
  | "INSUFFICIENT_FUNDS"
  | "OVER_BUDGET_LIMIT"
  // Sistema
  | "INTERNAL_ERROR"
  | "EXTERNAL_SERVICE_ERROR"
  | "RATE_LIMITED";
```

- [ ] **Step 2: Verificar typecheck**

Run: `cd "D:/Proyectos/Apps Web/app-quipu" && pnpm tsc --noEmit`
Expected: sin errores. Los nuevos codes son solo additive al union; nadie los consume todavía.

- [ ] **Step 3: Commit**

```bash
cd "D:/Proyectos/Apps Web/app-quipu"
git add core/errors/index.ts
git commit -m "chore(errors): add auth ErrorCode entries for v2.5"
```

---

## Task 2: Add errorMap table and unit tests

**Files:**
- Create: `modules/auth/types.ts`
- Create: `modules/auth/constants.ts`
- Create: `modules/auth/errorMap.ts`
- Create: `modules/auth/errorMap.test.ts`

**Interfaces:**
- Consumes: `ErrorCode` de `core/errors/index.ts`.
- Produces: `StatusVariant` (union de 5 strings), `MappedAuthError` (objeto con `code` y `message`), `mapBetterAuthError(input: { code: string; message?: string } | string): MappedAuthError`. Tasks 3, 4, 6 y 7 consumen `mapBetterAuthError`.

- [ ] **Step 1: Create `modules/auth/types.ts`**

Crea el archivo con:

```ts
import type { ErrorCode } from "@/core/errors";

/**
 * Variantes del status card compartido.
 * Mapean 1:1 a ErrorCode de auth (no todos los ErrorCode son variantes).
 */
export type StatusVariant =
  | "success"
  | "error"
  | "verify-error"
  | "network-error"
  | "expired-error";

/**
 * Error mapeado de Better Auth a AppError-compatible shape.
 * El cliente usa esto para renderizar el StatusCard correcto.
 */
export interface MappedAuthError {
  code: ErrorCode;
  message: string;
  variant: StatusVariant;
}

/**
 * Resultado tipado de las operaciones de passkey/email.
 * Sustituye la API de Better Auth que retorna { data, error } con error: unknown.
 */
export type AuthResult<T> =
  | { data: T; error: null }
  | { data: null; error: MappedAuthError };
```

- [ ] **Step 2: Create `modules/auth/constants.ts`**

Crea el archivo con:

```ts
/**
 * Mensajes en español para el usuario. Centralizado para que el copy
 * sea fácil de revisar y mantener consistente.
 */
export const AUTH_MESSAGES = {
  // Success
  signUpSuccessTitle: "¡Listo!",
  signUpSuccessDescription:
    "Tu cuenta está creada y protegida con Passkey. Ahora configuremos tu primer ciclo.",

  // Passkey
  passkeyVerifyError:
    "No pudimos verificarte. La verificación con Passkey se canceló o expiró.",
  passkeyNetworkError:
    "Sin conexión. Revisa tu internet e intenta de nuevo.",
  passkeyExpired: "La verificación expiró. Intenta de nuevo.",

  // Email/password
  userNotFound: "No encontramos una cuenta con ese correo.",
  invalidCredentials: "Correo o contraseña incorrectos.",
  emailTaken: "Ya existe una cuenta con ese correo. Inicia sesión.",

  // Genérico
  unknown: "Algo salió mal. Intenta de nuevo.",

  // CTAs
  retry: "Reintentar",
  useOtherMethod: "Usar otro método",
  configureMyCycle: "Configurar mi ciclo",
  createAccount: "Crear cuenta",
  signIn: "Iniciar sesión",
  signUp: "Crear con Passkey",
  emailLabel: "Correo",
  passwordLabel: "Contraseña",
  emailPlaceholder: "tu@correo.com",
  passkeyNotSupported: "Tu dispositivo no soporta Passkeys",
} as const;
```

- [ ] **Step 3: Write failing test in `modules/auth/errorMap.test.ts`**

Crea el archivo con:

```ts
import { describe, expect, it } from "vitest";
import { mapBetterAuthError } from "./errorMap";

describe("mapBetterAuthError", () => {
  it("maps SECURITY_ERROR to AUTH_PASSKEY_SECURITY_ERROR with verify-error variant", () => {
    const r = mapBetterAuthError("SECURITY_ERROR");
    expect(r.code).toBe("AUTH_PASSKEY_SECURITY_ERROR");
    expect(r.variant).toBe("verify-error");
    expect(r.message).toMatch(/No pudimos verificarte/);
  });

  it("maps lowercase security_error to the same code", () => {
    const r = mapBetterAuthError("security_error");
    expect(r.code).toBe("AUTH_PASSKEY_SECURITY_ERROR");
  });

  it("maps NETWORK_ERROR to network-error variant", () => {
    const r = mapBetterAuthError("NETWORK_ERROR");
    expect(r.code).toBe("AUTH_PASSKEY_NETWORK_ERROR");
    expect(r.variant).toBe("network-error");
  });

  it("maps network_error (lowercase) to the same code", () => {
    const r = mapBetterAuthError("network_error");
    expect(r.code).toBe("AUTH_PASSKEY_NETWORK_ERROR");
  });

  it("maps INVALID_CHALLENGE to expired-error variant", () => {
    const r = mapBetterAuthError("INVALID_CHALLENGE");
    expect(r.code).toBe("AUTH_PASSKEY_EXPIRED");
    expect(r.variant).toBe("expired-error");
  });

  it("maps USER_NOT_FOUND to error variant", () => {
    const r = mapBetterAuthError("USER_NOT_FOUND");
    expect(r.code).toBe("AUTH_USER_NOT_FOUND");
    expect(r.variant).toBe("error");
  });

  it("maps INVALID_EMAIL to AUTH_INVALID_CREDENTIALS", () => {
    const r = mapBetterAuthError("INVALID_EMAIL");
    expect(r.code).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("maps INVALID_PASSWORD to AUTH_INVALID_CREDENTIALS", () => {
    const r = mapBetterAuthError("INVALID_PASSWORD");
    expect(r.code).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("maps EMAIL_ALREADY_EXISTS to AUTH_EMAIL_TAKEN", () => {
    const r = mapBetterAuthError("EMAIL_ALREADY_EXISTS");
    expect(r.code).toBe("AUTH_EMAIL_TAKEN");
  });

  it("falls back to AUTH_UNKNOWN_ERROR for unknown codes", () => {
    const r = mapBetterAuthError("WEIRD_CODE");
    expect(r.code).toBe("AUTH_UNKNOWN_ERROR");
    expect(r.variant).toBe("error");
  });

  it("accepts object input with code property", () => {
    const r = mapBetterAuthError({ code: "NETWORK_ERROR" });
    expect(r.code).toBe("AUTH_PASSKEY_NETWORK_ERROR");
  });

  it("preserves custom message when provided in object input", () => {
    const r = mapBetterAuthError({
      code: "NETWORK_ERROR",
      message: "Custom message",
    });
    expect(r.message).toBe("Custom message");
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd "D:/Proyectos/Apps Web/app-quipu" && pnpm test -- modules/auth/errorMap.test.ts`
Expected: FAIL con "Cannot find module './errorMap'".

- [ ] **Step 5: Write minimal implementation in `modules/auth/errorMap.ts`**

Crea el archivo con:

```ts
import type { ErrorCode } from "@/core/errors";
import { AUTH_MESSAGES } from "./constants";
import type { MappedAuthError, StatusVariant } from "./types";

/**
 * Input de Better Auth: puede ser un string (código) o un objeto { code, message }.
 * Mantenemos la flexibilidad porque el cliente de Better Auth retorna `error.code`
 * como string y `error.message` opcional.
 */
type BetterAuthErrorInput = string | { code: string; message?: string };

interface ErrorMapping {
  code: ErrorCode;
  variant: StatusVariant;
  message: string;
}

const TABLE: Record<string, ErrorMapping> = {
  SECURITY_ERROR: {
    code: "AUTH_PASSKEY_SECURITY_ERROR",
    variant: "verify-error",
    message: AUTH_MESSAGES.passkeyVerifyError,
  },
  security_error: {
    code: "AUTH_PASSKEY_SECURITY_ERROR",
    variant: "verify-error",
    message: AUTH_MESSAGES.passkeyVerifyError,
  },
  NETWORK_ERROR: {
    code: "AUTH_PASSKEY_NETWORK_ERROR",
    variant: "network-error",
    message: AUTH_MESSAGES.passkeyNetworkError,
  },
  network_error: {
    code: "AUTH_PASSKEY_NETWORK_ERROR",
    variant: "network-error",
    message: AUTH_MESSAGES.passkeyNetworkError,
  },
  INVALID_CHALLENGE: {
    code: "AUTH_PASSKEY_EXPIRED",
    variant: "expired-error",
    message: AUTH_MESSAGES.passkeyExpired,
  },
  USER_NOT_FOUND: {
    code: "AUTH_USER_NOT_FOUND",
    variant: "error",
    message: AUTH_MESSAGES.userNotFound,
  },
  INVALID_EMAIL: {
    code: "AUTH_INVALID_CREDENTIALS",
    variant: "error",
    message: AUTH_MESSAGES.invalidCredentials,
  },
  INVALID_PASSWORD: {
    code: "AUTH_INVALID_CREDENTIALS",
    variant: "error",
    message: AUTH_MESSAGES.invalidCredentials,
  },
  EMAIL_ALREADY_EXISTS: {
    code: "AUTH_EMAIL_TAKEN",
    variant: "error",
    message: AUTH_MESSAGES.emailTaken,
  },
};

const FALLBACK: ErrorMapping = {
  code: "AUTH_UNKNOWN_ERROR",
  variant: "error",
  message: AUTH_MESSAGES.unknown,
};

export function mapBetterAuthError(input: BetterAuthErrorInput): MappedAuthError {
  const code = typeof input === "string" ? input : input.code;
  const customMessage = typeof input === "object" ? input.message : undefined;
  const mapping = TABLE[code] ?? FALLBACK;
  return {
    code: mapping.code,
    variant: mapping.variant,
    message: customMessage ?? mapping.message,
  };
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd "D:/Proyectos/Apps Web/app-quipu" && pnpm test -- modules/auth/errorMap.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 7: Verificar typecheck**

Run: `cd "D:/Proyectos/Apps Web/app-quipu" && pnpm tsc --noEmit`
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
cd "D:/Proyectos/Apps Web/app-quipu"
git add modules/auth/types.ts modules/auth/constants.ts modules/auth/errorMap.ts modules/auth/errorMap.test.ts
git commit -m "feat(auth): add errorMap with full Better Auth code coverage"
```

---

## Task 3: Add modules/auth/passkey.ts and modules/auth/emailPassword.ts wrappers

**Files:**
- Create: `modules/auth/passkey.ts`
- Create: `modules/auth/emailPassword.ts`
- Create: `modules/auth/schemas.ts`

**Interfaces:**
- Consumes: `authClient` de `@/auth/auth-client`, `mapBetterAuthError` de `./errorMap`, `AuthResult` de `./types`.
- Produces: `registerPasskey({ name?, context? }): Promise<AuthResult<unknown>>`, `signInWithPasskey(autoFill?): Promise<AuthResult<unknown>>`, `signInWithEmail({ email, password }): Promise<AuthResult<unknown>>`, `signUpWithEmail({ email, password, name }): Promise<AuthResult<unknown>>`. Schemas Zod para validación client-side. Tasks 6 y 7 los consumen.

- [ ] **Step 1: Create `modules/auth/schemas.ts`**

Crea el archivo con:

```ts
import { z } from "zod";

/**
 * Schemas Zod para validación client-side de formularios auth.
 * El server (Convex) hace su propia validación; este es solo UX.
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "El correo es obligatorio")
  .pipe(z.email("Correo inválido"));

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres");

export const signInEmailSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signUpEmailSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1, "El nombre es obligatorio").optional(),
});

export const signInPasskeySchema = z.object({
  email: emailSchema,
});

export type SignInEmailInput = z.infer<typeof signInEmailSchema>;
export type SignUpEmailInput = z.infer<typeof signUpEmailSchema>;
export type SignInPasskeyInput = z.infer<typeof signInPasskeySchema>;
```

- [ ] **Step 2: Create `modules/auth/passkey.ts`**

Crea el archivo con:

```ts
import { authClient } from "@/auth/auth-client";
import { mapBetterAuthError } from "./errorMap";
import type { AuthResult } from "./types";

/**
 * Wrappers tipados sobre authClient.passkey.
 *
 * DEV NOTE: Este archivo reemplaza `auth/passkey.ts` (viejo). El viejo se borra
 * en el commit 5 de este plan. Hasta entonces conviven ambos.
 *
 * El return type cambia: antes era `result` (cualquier shape) y el caller
 * discriminaba `result.error` con strings. Ahora es AuthResult<T> con
 * MappedAuthError tipado.
 */
export async function registerPasskey({
  name,
  context,
}: {
  name?: string;
  context?: string;
} = {}): Promise<AuthResult<unknown>> {
  const result = await authClient.passkey.addPasskey({ name, context });
  if (result.error) {
    return {
      data: null,
      error: mapBetterAuthError({
        code: result.error.code ?? "UNKNOWN",
        message: result.error.message,
      }),
    };
  }
  return { data: result.data, error: null };
}

/**
 * Sign in con passkey.
 * - autoFill=true: Conditional UI (prompt nativo al pulsar sobre input con autocomplete="webauthn").
 * - autoFill=false: prompt explícito al pulsar el botón.
 */
export async function signInWithPasskey(
  autoFill = true,
): Promise<AuthResult<unknown>> {
  const result = await authClient.signIn.passkey({ autoFill });
  if (result.error) {
    return {
      data: null,
      error: mapBetterAuthError({
        code: result.error.code ?? "UNKNOWN",
        message: result.error.message,
      }),
    };
  }
  return { data: result.data, error: null };
}
```

- [ ] **Step 3: Create `modules/auth/emailPassword.ts`**

Crea el archivo con:

```ts
import { authClient } from "@/auth/auth-client";
import { mapBetterAuthError } from "./errorMap";
import type { AuthResult } from "./types";
import type { SignInEmailInput, SignUpEmailInput } from "./schemas";

export async function signInWithEmail(
  input: SignInEmailInput,
): Promise<AuthResult<unknown>> {
  const result = await authClient.signIn.email({
    email: input.email,
    password: input.password,
  });
  if (result.error) {
    return {
      data: null,
      error: mapBetterAuthError({
        code: result.error.code ?? "UNKNOWN",
        message: result.error.message,
      }),
    };
  }
  return { data: result.data, error: null };
}

export async function signUpWithEmail(
  input: SignUpEmailInput,
): Promise<AuthResult<unknown>> {
  const result = await authClient.signUp.email({
    email: input.email,
    password: input.password,
    name: input.name ?? input.email.split("@")[0]!,
  });
  if (result.error) {
    return {
      data: null,
      error: mapBetterAuthError({
        code: result.error.code ?? "UNKNOWN",
        message: result.error.message,
      }),
    };
  }
  return { data: result.data, error: null };
}
```

- [ ] **Step 4: Verificar typecheck**

Run: `cd "D:/Proyectos/Apps Web/app-quipu" && pnpm tsc --noEmit`
Expected: sin errores. Los wrappers son nuevos y nadie los importa todavía.

- [ ] **Step 5: Commit**

```bash
cd "D:/Proyectos/Apps Web/app-quipu"
git add modules/auth/schemas.ts modules/auth/passkey.ts modules/auth/emailPassword.ts
git commit -m "feat(auth): add typed passkey and email/password wrappers"
```

---

## Task 4: Add status-card and status-icon reusable components

**Files:**
- Create: `shared/components/auth/status-card.tsx`
- Create: `shared/components/auth/status-icon.tsx`
- Create: `shared/components/auth/status-card.test.tsx`
- Create: `shared/components/auth/status-icon.test.tsx`

**Interfaces:**
- Consumes: lucide-react (`Check`, `X`, `WifiOff`), tokens del CSS via class names (`bg-success-soft`, `text-success`, `bg-destructive-soft`, `text-destructive`, `bg-warning-soft`, `text-warning`).
- Produces: `<StatusCard variant title description primaryAction? secondaryAction? />`, `<StatusIcon variant size? />`. Tasks 6 y 7 los usan.

- [ ] **Step 1: Create `shared/components/auth/status-icon.tsx`**

Crea el archivo con:

```tsx
import { Check, WifiOff, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { StatusVariant } from "@/modules/auth/types";

interface StatusIconProps {
  variant: StatusVariant;
  size?: "default" | "sm";
  className?: string;
}

const VARIANT_STYLES: Record<StatusVariant, { bg: string; icon: string }> = {
  success: { bg: "bg-success-soft", icon: "text-success" },
  error: { bg: "bg-destructive-soft", icon: "text-destructive" },
  "verify-error": { bg: "bg-destructive-soft", icon: "text-destructive" },
  "network-error": { bg: "bg-warning-soft", icon: "text-warning" },
  "expired-error": { bg: "bg-destructive-soft", icon: "text-destructive" },
};

const VARIANT_ICONS: Record<
  StatusVariant,
  React.ComponentType<{ className?: string }>
> = {
  success: Check,
  error: X,
  "verify-error": X,
  "network-error": WifiOff,
  "expired-error": X,
};

export function StatusIcon({ variant, size = "default", className }: StatusIconProps) {
  const styles = VARIANT_STYLES[variant];
  const Icon = VARIANT_ICONS[variant];
  const sizeClass = size === "sm" ? "size-10" : "size-16";
  const iconSize = size === "sm" ? "size-5" : "size-8";
  return (
    <div
      data-slot="status-icon"
      data-variant={variant}
      className={cn(
        "flex items-center justify-center rounded-full motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95",
        sizeClass,
        styles.bg,
        className,
      )}
      aria-hidden="true"
    >
      <Icon className={cn(iconSize, styles.icon)} />
    </div>
  );
}
```

- [ ] **Step 2: Create `shared/components/auth/status-card.tsx`**

Crea el archivo con:

```tsx
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { StatusIcon } from "./status-icon";
import type { StatusVariant } from "@/modules/auth/types";

interface ActionConfig {
  label: string;
  href: string;
}

interface StatusCardProps {
  variant: StatusVariant;
  title: string;
  description: string;
  primaryAction?: ActionConfig;
  secondaryAction?: ActionConfig;
}

export function StatusCard({
  variant,
  title,
  description,
  primaryAction,
  secondaryAction,
}: StatusCardProps) {
  return (
    <Card
      data-slot="status-card"
      data-variant={variant}
      className="mx-auto w-full max-w-md"
    >
      <CardHeader className="items-center text-center">
        <StatusIcon variant={variant} />
        <CardTitle className="mt-4 text-xl">{title}</CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      {(primaryAction || secondaryAction) && (
        <CardContent className="flex flex-col gap-3">
          {primaryAction && (
            <Link
              href={primaryAction.href}
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-12 w-full",
              )}
            >
              {primaryAction.label}
            </Link>
          )}
          {secondaryAction && (
            <Link
              href={secondaryAction.href}
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "h-12 w-full",
              )}
            >
              {secondaryAction.label}
            </Link>
          )}
        </CardContent>
      )}
    </Card>
  );
}
```

Si typecheck falla con el código original, **usar el patrón alternativo**. Documentar el cambio en el commit message.

- [ ] **Step 3: Write failing test in `shared/components/auth/status-icon.test.tsx`**

Crea el archivo con:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusIcon } from "./status-icon";

describe("StatusIcon", () => {
  it("renders with bg-success-soft and text-success for success variant", () => {
    const { container } = render(<StatusIcon variant="success" />);
    const div = container.querySelector('[data-slot="status-icon"]');
    expect(div?.className).toContain("bg-success-soft");
    expect(div?.className).toContain("text-success");
    expect(div?.getAttribute("data-variant")).toBe("success");
  });

  it("renders with destructive styles for error variant", () => {
    const { container } = render(<StatusIcon variant="error" />);
    const div = container.querySelector('[data-slot="status-icon"]');
    expect(div?.className).toContain("bg-destructive-soft");
    expect(div?.className).toContain("text-destructive");
  });

  it("renders with warning styles for network-error variant", () => {
    const { container } = render(<StatusIcon variant="network-error" />);
    const div = container.querySelector('[data-slot="status-icon"]');
    expect(div?.className).toContain("bg-warning-soft");
    expect(div?.className).toContain("text-warning");
  });

  it("applies sm size class when size=sm", () => {
    const { container } = render(<StatusIcon variant="success" size="sm" />);
    const div = container.querySelector('[data-slot="status-icon"]');
    expect(div?.className).toContain("size-10");
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd "D:/Proyectos/Apps Web/app-quipu" && pnpm test -- shared/components/auth/status-icon.test.tsx`
Expected: FAIL con "Cannot find module './status-icon'" o error de import similar.

- [ ] **Step 5: Write failing test in `shared/components/auth/status-card.test.tsx`**

Crea el archivo con:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusCard } from "./status-card";

describe("StatusCard", () => {
  it("renders title and description", () => {
    render(
      <StatusCard
        variant="success"
        title="¡Listo!"
        description="Tu cuenta está creada."
      />,
    );
    expect(screen.getByText("¡Listo!")).toBeDefined();
    expect(screen.getByText("Tu cuenta está creada.")).toBeDefined();
  });

  it("renders primary and secondary actions as links", () => {
    render(
      <StatusCard
        variant="error"
        title="Error"
        description="Algo falló"
        primaryAction={{ label: "Reintentar", href: "/retry" }}
        secondaryAction={{ label: "Usar otro método", href: "/other" }}
      />,
    );
    const retryLink = screen.getByText("Reintentar").closest("a");
    expect(retryLink?.getAttribute("href")).toBe("/retry");
    const otherLink = screen.getByText("Usar otro método").closest("a");
    expect(otherLink?.getAttribute("href")).toBe("/other");
  });

  it("omits actions section when no actions provided", () => {
    const { container } = render(
      <StatusCard variant="success" title="OK" description="..." />,
    );
    const card = container.querySelector('[data-slot="status-card"]');
    expect(card?.getAttribute("data-variant")).toBe("success");
    // CardContent no se renderiza si no hay actions.
    const links = card?.querySelectorAll("a");
    expect(links?.length).toBe(0);
  });
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd "D:/Proyectos/Apps Web/app-quipu" && pnpm test -- shared/components/auth/`
Expected: PASS (4 + 3 = 7 tests).

- [ ] **Step 7: Verificar typecheck y lint**

Run:
```bash
cd "D:/Proyectos/Apps Web/app-quipu" && pnpm tsc --noEmit && pnpm lint
```
Expected: typecheck sin errores. Si lint reporta formato, correr `pnpm format` antes del commit.

- [ ] **Step 8: Commit**

```bash
cd "D:/Proyectos/Apps Web/app-quipu"
git add shared/components/auth/status-icon.tsx shared/components/auth/status-card.tsx shared/components/auth/status-icon.test.tsx shared/components/auth/status-card.test.tsx
git commit -m "feat(auth): add status-card and status-icon reusable components"
```

---

## Task 5: Add auth-shell, passkey-prompt-button, email-password-form, status-state

**Files:**
- Create: `modules/auth/components/auth-shell.tsx`
- Create: `modules/auth/components/status-state.tsx`
- Create: `modules/auth/components/passkey-prompt-button.tsx`
- Create: `modules/auth/components/email-password-form.tsx`
- Create: `modules/auth/components/passkey-prompt-button.test.tsx`
- Create: `modules/auth/components/email-password-form.test.tsx`

**Interfaces:**
- Consumes: wrappers de `modules/auth/passkey.ts` y `modules/auth/emailPassword.ts`, `StatusCard` y `StatusIcon` de `shared/components/auth/`, primitivos UI ya existentes (`Button`, `Field`, `FieldError`, `FieldGroup`, `FieldLabel`, `InputGroup`, `InputGroupAddon`, `InputGroupInput`, `Spinner`).
- Produces: `<AuthShell>{children}</AuthShell>` (server), `useStatusState()` (hook que lee `searchParams.status`), `<PasskeyPromptButton mode="signIn" | "signUp" />` (client), `<EmailPasswordForm mode="signIn" | "signUp" />` (client). Tasks 6, 7 los importan.

- [ ] **Step 1: Create `modules/auth/components/auth-shell.tsx`**

Crea el archivo con:

```tsx
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create `modules/auth/components/status-state.tsx`**

Crea el archivo con:

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import type { StatusVariant } from "@/modules/auth/types";

/**
 * Hook que lee el query param `status` y devuelve la variante del card.
 * Usado por las páginas sign-up para mostrar "¡Listo, Lucía!" después del éxito.
 *
 * Variantes soportadas:
 * - ?status=success → "success"
 * - ?error=CODE → mapea desde el code de error (delegado al componente que renderiza)
 *
 * El componente que renderiza hace el switch sobre el valor.
 */
export function useStatusState(): {
  success: boolean;
  errorCode: string | null;
} {
  const searchParams = useSearchParams();
  return {
    success: searchParams.get("status") === "success",
    errorCode: searchParams.get("error"),
  };
}
```

- [ ] **Step 3: Write failing test in `modules/auth/components/passkey-prompt-button.test.tsx`**

Crea el archivo con:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PasskeyPromptButton } from "./passkey-prompt-button";

// Mock del wrapper de passkey
vi.mock("@/modules/auth/passkey", () => ({
  signInWithPasskey: vi.fn(),
  registerPasskey: vi.fn(),
}));

// Mock de useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

import { signInWithPasskey, registerPasskey } from "@/modules/auth/passkey";

describe("PasskeyPromptButton", () => {
  beforeEach(() => {
    // Default: dispositivo soporta passkey
    Object.defineProperty(window, "PublicKeyCredential", {
      value: { isUserVerifyingPlatformAuthenticatorAvailable: () => Promise.resolve(true) },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders enabled button when platform authenticator is available", async () => {
    render(<PasskeyPromptButton mode="signIn" />);
    await waitFor(() => {
      const btn = screen.getByRole("button");
      expect(btn.hasAttribute("disabled")).toBe(false);
    });
  });

  it("renders disabled button with 'no soporta' message when not available", async () => {
    Object.defineProperty(window, "PublicKeyCredential", {
      value: { isUserVerifyingPlatformAuthenticatorAvailable: () => Promise.resolve(false) },
      configurable: true,
      writable: true,
    });
    render(<PasskeyPromptButton mode="signIn" />);
    await waitFor(() => {
      expect(screen.getByText(/no soporta Passkeys/i)).toBeDefined();
    });
  });

  it("calls signInWithPasskey on click in signIn mode", async () => {
    (signInWithPasskey as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {},
      error: null,
    });
    render(<PasskeyPromptButton mode="signIn" />);
    await waitFor(() => {
      const btn = screen.getByRole("button");
      expect(btn.hasAttribute("disabled")).toBe(false);
    });
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(signInWithPasskey).toHaveBeenCalledWith(false);
    });
  });

  it("calls registerPasskey on click in signUp mode", async () => {
    (registerPasskey as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {},
      error: null,
    });
    render(<PasskeyPromptButton mode="signUp" email="test@quipu.pe" />);
    await waitFor(() => {
      const btn = screen.getByRole("button");
      expect(btn.hasAttribute("disabled")).toBe(false);
    });
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(registerPasskey).toHaveBeenCalledWith({
        name: "test@quipu.pe",
        context: "test@quipu.pe",
      });
    });
  });
});
```

- [ ] **Step 4: Create `modules/auth/components/passkey-prompt-button.tsx`**

Crea el archivo con:

```tsx
"use client";

import { Fingerprint } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";
import { registerPasskey, signInWithPasskey } from "@/modules/auth/passkey";
import { AUTH_MESSAGES } from "@/modules/auth/constants";
import type { MappedAuthError } from "@/modules/auth/types";

type Mode = "signIn" | "signUp";

interface PasskeyPromptButtonProps {
  mode: Mode;
  email?: string;
}

export function PasskeyPromptButton({ mode, email }: PasskeyPromptButtonProps) {
  const router = useRouter();
  const [hasPlatformAuth, setHasPlatformAuth] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<MappedAuthError | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) {
      setHasPlatformAuth(false);
      return;
    }
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .then(setHasPlatformAuth)
      .catch(() => setHasPlatformAuth(false));
  }, []);

  const handleClick = async () => {
    if (!hasPlatformAuth) return;
    setIsLoading(true);
    setError(null);

    const result =
      mode === "signIn"
        ? await signInWithPasskey(false)
        : await registerPasskey({
            name: email,
            context: email,
          });

    setIsLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    // Éxito: la página server decide el destino.
    // - signIn: el helper requireUnauthenticatedSession detecta sesión y redirige a /dashboard.
    // - signUp: queremos mostrar primero la pantalla de status "Listo" antes de ir a onboarding.
    if (mode === "signUp") {
      router.replace("/sign-up?status=success");
    } else {
      router.refresh();
    }
  };

  const label = mode === "signIn" ? AUTH_MESSAGES.signIn : AUTH_MESSAGES.signUp;
  const isDisabled = hasPlatformAuth !== true || isLoading;

  if (hasPlatformAuth === null) {
    return (
      <Button size="lg" disabled className="h-12 w-full">
        <Spinner data-icon="inline-start" /> Cargando
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        size="lg"
        onClick={handleClick}
        disabled={isDisabled}
        className="h-12 w-full"
        data-error={error?.code ?? undefined}
      >
        {isLoading ? (
          <>
            <Spinner data-icon="inline-start" /> Cargando
          </>
        ) : (
          <>
            <Fingerprint data-icon="inline-start" /> {label}
          </>
        )}
      </Button>
      {!hasPlatformAuth && (
        <p className="text-center text-sm text-muted-foreground">
          {AUTH_MESSAGES.passkeyNotSupported}
        </p>
      )}
      {/* El link "Usar otro método" lo renderiza la página padre, no este componente. */}
    </div>
  );
}
```

**Nota importante:** en sign-up el botón redirige a `?status=success` para mostrar la pantalla de éxito antes de ir a onboarding. En sign-in, simplemente hace `router.refresh()` y deja que `requireUnauthenticatedSession` de la página decida el destino (dashboard si hay profile, onboarding si no). Esto preserva la decisión 3 del spec: usuario existente no ve el status card.

- [ ] **Step 5: Run test to verify it fails**

Run: `cd "D:/Proyectos/Apps Web/app-quipu" && pnpm test -- modules/auth/components/passkey-prompt-button.test.tsx`
Expected: FAIL con "Cannot find module './passkey-prompt-button'".

- [ ] **Step 6: Write failing test in `modules/auth/components/email-password-form.test.tsx`**

Crea el archivo con:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmailPasswordForm } from "./email-password-form";

vi.mock("@/modules/auth/emailPassword", () => ({
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

import { signInWithEmail, signUpWithEmail } from "@/modules/auth/emailPassword";

describe("EmailPasswordForm", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls signInWithEmail on submit in signIn mode", async () => {
    (signInWithEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {},
      error: null,
    });
    render(<EmailPasswordForm mode="signIn" />);
    fireEvent.change(screen.getByLabelText(/correo/i), {
      target: { value: "test@quipu.pe" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));
    await waitFor(() => {
      expect(signInWithEmail).toHaveBeenCalledWith({
        email: "test@quipu.pe",
        password: "password123",
      });
    });
  });

  it("calls signUpWithEmail on submit in signUp mode", async () => {
    (signUpWithEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {},
      error: null,
    });
    render(<EmailPasswordForm mode="signUp" />);
    fireEvent.change(screen.getByLabelText(/correo/i), {
      target: { value: "new@quipu.pe" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
    await waitFor(() => {
      expect(signUpWithEmail).toHaveBeenCalled();
    });
  });

  it("shows error message when signIn fails", async () => {
    (signInWithEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: {
        code: "AUTH_INVALID_CREDENTIALS",
        message: "Correo o contraseña incorrectos.",
        variant: "error",
      },
    });
    render(<EmailPasswordForm mode="signIn" />);
    fireEvent.change(screen.getByLabelText(/correo/i), {
      target: { value: "wrong@quipu.pe" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "badpassword" },
    });
    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/correo o contraseña incorrectos/i),
      ).toBeDefined();
    });
  });
});
```

- [ ] **Step 7: Create `modules/auth/components/email-password-form.tsx`**

Crea el archivo con:

```tsx
"use client";

import { useForm } from "@tanstack/react-form";
import { Check, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/components/ui/input-group";
import { Spinner } from "@/shared/components/ui/spinner";
import { signInWithEmail, signUpWithEmail } from "@/modules/auth/emailPassword";
import { signInEmailSchema, signUpEmailSchema } from "@/modules/auth/schemas";
import { AUTH_MESSAGES } from "@/modules/auth/constants";
import type { MappedAuthError } from "@/modules/auth/types";

type Mode = "signIn" | "signUp";

interface EmailPasswordFormProps {
  mode: Mode;
}

export function EmailPasswordForm({ mode }: EmailPasswordFormProps) {
  const [error, setError] = useState<MappedAuthError | null>(null);

  const schema = mode === "signIn" ? signInEmailSchema : signUpEmailSchema;
  const submitLabel =
    mode === "signIn" ? AUTH_MESSAGES.signIn : AUTH_MESSAGES.createAccount;

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: ({ value }) => {
      const parsed = schema.safeParse(value);
      if (!parsed.success) {
        return parsed.error.issues.map((i) => i.message).join(", ");
      }
      return undefined;
    } },
    onSubmit: async ({ value }) => {
      setError(null);
      const result =
        mode === "signIn"
          ? await signInWithEmail(value)
          : await signUpWithEmail(value);
      if (result.error) {
        setError(result.error);
        return;
      }
      // Éxito: la página server hace el redirect. Aquí no hacemos nada.
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field
          name="email"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor="email">{AUTH_MESSAGES.emailLabel}</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <Mail data-icon="inline-start" />
                  </InputGroupAddon>
                  <InputGroupInput
                    type="email"
                    inputMode="email"
                    autoComplete={mode === "signIn" ? "username webauthn" : "username"}
                    placeholder={AUTH_MESSAGES.emailPlaceholder}
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    aria-invalid={isInvalid}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {!isInvalid && (
                    <InputGroupAddon align="inline-end">
                      <Check
                        data-icon="inline-end"
                        className="text-success"
                        aria-label="Email con formato válido"
                      />
                    </InputGroupAddon>
                  )}
                </InputGroup>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
        <form.Field
          name="password"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor="password">{AUTH_MESSAGES.passwordLabel}</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    type="password"
                    autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    aria-invalid={isInvalid}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </InputGroup>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
      </FieldGroup>

      {error && (
        <p
          role="alert"
          className="mt-4 text-center text-sm text-destructive"
        >
          {error.message}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <Button
          type="submit"
          size="lg"
          className="h-12 w-full text-sm font-semibold"
        >
          {form.state.isSubmitting ? (
            <>
              <Spinner data-icon="inline-start" /> Cargando
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd "D:/Proyectos/Apps Web/app-quipu" && pnpm test -- modules/auth/components/"
Expected: PASS (4 + 3 = 7 tests).

- [ ] **Step 9: Verificar typecheck y lint**

Run:
```bash
cd "D:/Proyectos/Apps Web/app-quipu" && pnpm tsc --noEmit && pnpm lint
```
Expected: typecheck sin errores. `pnpm format` si lint reporta issues de estilo.

- [ ] **Step 10: Commit**

```bash
cd "D:/Proyectos/Apps Web/app-quipu"
git add modules/auth/components/auth-shell.tsx modules/auth/components/status-state.tsx modules/auth/components/passkey-prompt-button.tsx modules/auth/components/email-password-form.tsx modules/auth/components/passkey-prompt-button.test.tsx modules/auth/components/email-password-form.test.tsx
git commit -m "feat(auth): add passkey-prompt, email-password form, and auth-shell"
```

---

## Task 6: Add requireUnauthenticatedSession helper and (app) layout

**Files:**
- Modify: `auth/auth-server.ts` (agregar helper)
- Create: `app/(app)/layout.tsx`
- Create: `app/(app)/onboarding/page.tsx`
- Create: `app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `isAuthenticated`, `getToken`, `fetchAuthQuery` de `auth/auth-server.ts`; `api.profiles.getMyProfile`.
- Produces: `requireUnauthenticatedSession()` que redirige a `/onboarding` o `/dashboard` si hay sesión. `requireAuthenticatedSession()` que redirige a `/sign-in` si no. Tasks 7 los usa.

- [ ] **Step 1: Edit `auth/auth-server.ts` para agregar los helpers**

Reemplaza el contenido del archivo con:

```ts
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";

export const {
  handler,
  preloadAuthQuery,
  isAuthenticated,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
});

/**
 * Redirige al usuario ya autenticado al destino correcto según su profile.
 * Usar como primera línea en page.tsx de rutas auth (NO en layout.tsx).
 *
 * - Si hay sesión y profile → /dashboard
 * - Si hay sesión sin profile → /onboarding
 * - Si no hay sesión → no hace nada
 */
export async function requireUnauthenticatedSession() {
  const authed = await isAuthenticated();
  if (!authed) return;
  const profile = await fetchAuthQuery(api.profiles.getMyProfile, {});
  if (profile) {
    redirect("/dashboard");
  } else {
    redirect("/onboarding");
  }
}

/**
 * Garantiza que el usuario está autenticado. Si no, redirige a /sign-in.
 * Usar como primera línea en page.tsx de rutas protegidas (NO en layout.tsx).
 */
export async function requireAuthenticatedSession() {
  const authed = await isAuthenticated();
  if (!authed) {
    redirect("/sign-in");
  }
}
```

- [ ] **Step 2: Create `app/(app)/layout.tsx`**

Crea el archivo con:

```tsx
import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-full flex-1 bg-background">{children}</div>;
}
```

- [ ] **Step 3: Create `app/(app)/onboarding/page.tsx`**

Crea el archivo con:

```tsx
import {
  fetchAuthQuery,
  requireAuthenticatedSession,
} from "@/auth/auth-server";
import { api } from "@/convex/_generated/api";

export default async function OnboardingPage() {
  await requireAuthenticatedSession();
  const profile = await fetchAuthQuery(api.profiles.getMyProfile, {});
  if (profile) {
    // Ya completó onboarding, mandarlo al dashboard.
    // El redirect corta la renderización.
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-heading text-2xl font-semibold">
        Onboarding (próximamente)
      </h1>
      <p className="mt-2 text-muted-foreground">
        El wizard de configuración se implementa en P0-2.
      </p>
    </main>
  );
}
```

**Nota:** el `import` dinámico de `redirect` es para mantener el `requireAuthenticatedSession` sin import circular. Alternativa: hacer el redirect desde la page directamente sin helper. Si la página no debe usar `requireAuthenticatedSession`, eliminar la línea y hacer el check manualmente.

- [ ] **Step 4: Create `app/(app)/dashboard/page.tsx`**

Crea el archivo con:

```tsx
import {
  fetchAuthQuery,
  requireAuthenticatedSession,
} from "@/auth/auth-server";
import { api } from "@/convex/_generated/api";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  await requireAuthenticatedSession();
  const profile = await fetchAuthQuery(api.profiles.getMyProfile, {});
  if (!profile) {
    redirect("/onboarding");
  }
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-heading text-2xl font-semibold">
        Dashboard (próximamente)
      </h1>
      <p className="mt-2 text-muted-foreground">
        El dashboard real se implementa en otra historia.
      </p>
    </main>
  );
}
```

- [ ] **Step 5: Verificar typecheck**

Run: `cd "D:/Proyectos/Apps Web/app-quipu" && pnpm tsc --noEmit`
Expected: sin errores. Los nuevos archivos no importan nada que no exista (excepto `requireAuthenticatedSession` que acabamos de agregar).

- [ ] **Step 6: Commit**

```bash
cd "D:/Proyectos/Apps Web/app-quipu"
git add auth/auth-server.ts "app/(app)/layout.tsx" "app/(app)/onboarding/page.tsx" "app/(app)/dashboard/page.tsx"
git commit -m "feat(auth): add session helpers and onboarding/dashboard placeholders"
```

---

## Task 7: Add sign-in, sign-up, sign-in/email, sign-up/email pages

**Files:**
- Modify: `app/(auth)/layout.tsx` (crear — solo `<AuthShell>`)
- Create: `app/(auth)/sign-in/page.tsx`
- Create: `app/(auth)/sign-up/page.tsx`
- Create: `app/(auth)/sign-in/email/page.tsx`
- Create: `app/(auth)/sign-up/email/page.tsx`
- Create: `docs/auth-smoke.md`

**Interfaces:**
- Consumes: `requireUnauthenticatedSession` de `auth/auth-server`, `PasskeyPromptButton`, `EmailPasswordForm`, `StatusCard` de `modules/auth/components/` y `shared/components/auth/`. El `searchParams` viene como prop en Next 15+.
- Produces: las 4 rutas funcionales. Smoke test reproducible.

- [ ] **Step 1: Create `app/(auth)/layout.tsx`**

Crea el archivo con:

```tsx
import type { ReactNode } from "react";
import { AuthShell } from "@/modules/auth/components/auth-shell";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
```

- [ ] **Step 2: Create `app/(auth)/sign-in/page.tsx`**

Crea el archivo con:

```tsx
import Link from "next/link";
import { requireUnauthenticatedSession } from "@/auth/auth-server";
import { PasskeyPromptButton } from "@/modules/auth/components/passkey-prompt-button";
import { AUTH_MESSAGES } from "@/modules/auth/constants";

export default async function SignInPage() {
  await requireUnauthenticatedSession();

  // Si llegamos acá sin redirect, no hay sesión. Renderizar el form.
  // Nota: el botón passkey no muestra ?status=success en sign-in porque
  // un usuario existente va directo a dashboard (decisión 3 del spec).

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          {/* Logo placeholder */}
          <span className="font-heading text-lg font-semibold">Q</span>
        </div>
        <h1 className="font-heading text-2xl font-semibold">Inicia sesión</h1>
        <p className="text-sm text-muted-foreground">
          Continúa con Passkey para acceder de forma segura.
        </p>
      </header>

      <PasskeyPromptButton mode="signIn" />

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/sign-in/email"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          {AUTH_MESSAGES.useOtherMethod}
        </Link>
      </p>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Inicia el registro
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/(auth)/sign-up/page.tsx`**

Crea el archivo con:

```tsx
import Link from "next/link";
import { requireUnauthenticatedSession } from "@/auth/auth-server";
import { PasskeyPromptButton } from "@/modules/auth/components/passkey-prompt-button";
import { StatusCard } from "@/shared/components/auth/status-card";
import { AUTH_MESSAGES } from "@/modules/auth/constants";
import { Card, CardContent } from "@/shared/components/ui/card";

interface PageProps {
  searchParams: Promise<{ status?: string; error?: string }>;
}

export default async function SignUpPage({ searchParams }: PageProps) {
  await requireUnauthenticatedSession();
  const params = await searchParams;

  if (params.status === "success") {
    return (
      <StatusCard
        variant="success"
        title={AUTH_MESSAGES.signUpSuccessTitle}
        description={AUTH_MESSAGES.signUpSuccessDescription}
        primaryAction={{
          label: AUTH_MESSAGES.configureMyCycle,
          href: "/onboarding",
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <span className="font-heading text-lg font-semibold">Q</span>
        </div>
        <h1 className="font-heading text-2xl font-semibold">Crea tu cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Sin contraseñas que recordar. Solo tú con una llave segura en este dispositivo.
        </p>
      </header>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium">
              {AUTH_MESSAGES.emailLabel}
            </label>
            <PasskeyPromptButton mode="signUp" email="placeholder@quipu.pe" />
            <p className="text-xs text-muted-foreground">
              Tu dispositivo creará una llave única protegida con Face ID o huella.
            </p>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/sign-up/email"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          {AUTH_MESSAGES.useOtherMethod}
        </Link>
      </p>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
```

**Nota importante:** el componente `PasskeyPromptButton` requiere `email` (lo usa como `context` para `resolveUser`). En sign-up, el email es input del usuario. **Refactorizar el SignUpPage** para que tenga un sub-form que capture el email primero y luego muestre el botón passkey. **O**: hacer que `PasskeyPromptButton` en `mode="signUp"` abra un modal/prompt para capturar el email antes de llamar a `registerPasskey`. Para esta implementación mínima (placeholder), el email hardcoded arriba es aceptable como placeholder, pero la versión real debe capturar el email.

**Por ahora**, dejar el `email="placeholder@quipu.pe"` como placeholder. La mejora (capturar email antes) queda como P2.

- [ ] **Step 4: Create `app/(auth)/sign-in/email/page.tsx`**

Crea el archivo con:

```tsx
import Link from "next/link";
import { requireUnauthenticatedSession } from "@/auth/auth-server";
import { EmailPasswordForm } from "@/modules/auth/components/email-password-form";
import { AUTH_MESSAGES } from "@/modules/auth/constants";

export default async function SignInEmailPage() {
  await requireUnauthenticatedSession();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-heading text-2xl font-semibold">Inicia sesión</h1>
        <p className="text-sm text-muted-foreground">
          Ingresa tu correo y contraseña.
        </p>
      </header>

      <EmailPasswordForm mode="signIn" />

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/sign-in"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Volver a Passkey
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Create `app/(auth)/sign-up/email/page.tsx`**

Crea el archivo con:

```tsx
import Link from "next/link";
import { requireUnauthenticatedSession } from "@/auth/auth-server";
import { EmailPasswordForm } from "@/modules/auth/components/email-password-form";
import { AUTH_MESSAGES } from "@/modules/auth/constants";

export default async function SignUpEmailPage() {
  await requireUnauthenticatedSession();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-heading text-2xl font-semibold">Crea tu cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Ingresa tu correo y una contraseña de al menos 8 caracteres.
        </p>
      </header>

      <EmailPasswordForm mode="signUp" />

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/sign-up"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Volver a Passkey
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 6: Create `docs/auth-smoke.md`**

Crea el archivo con:

```markdown
# Auth Smoke Test — Quipu v2.5

## Pre-requisitos
- `npx convex dev` corriendo (terminal 1).
- `pnpm dev` corriendo (terminal 2).
- Browsers: Chrome (WebAuthn + autofill) y Firefox (sin passkey platform).
- Cuenta de prueba limpia. Borrar el user de Better Auth en Convex dashboard entre runs.

## Casos

### A. Sign-up con passkey (usuario nuevo)
1. Ir a `http://localhost:3000/sign-up`.
2. (TODO: capturar email en el form antes de mostrar el botón. Por ahora el email está hardcoded.)
3. Click "Crear con Passkey".
4. Autorizar passkey con Touch ID / Windows Hello.
5. URL cambia a `/sign-up?status=success`.
6. Aparece status card verde "¡Listo!" con CTA "Configurar mi ciclo".
7. Click CTA → aterriza en `/onboarding` (placeholder).
8. ✅ Sesión activa, redirect correcto.

### B. Sign-in con passkey (usuario existente con profile)
1. (Pre-condición: usuario A ya completó P0-2 onboarding en una sesión previa.)
2. Logout (limpiar cookies).
3. Ir a `/sign-in`.
4. Click "Iniciar sesión con Passkey".
5. Autorizar passkey.
6. Redirect directo a `/dashboard` (sin status card, sin pasar por `?status=success`).
7. ✅ Sesión activa, aterriza en dashboard.

### C. Sign-in con email/password (fallback)
1. Ir a `/sign-in`.
2. Click "Usar otro método" → aterriza en `/sign-in/email`.
3. Tipear email y password de un usuario existente.
4. Redirect a `/dashboard` o `/onboarding` según profile.
5. ✅ Sesión activa.

### D. Sign-up con email/password
1. Ir a `/sign-up`.
2. Click "Usar otro método" → aterriza en `/sign-up/email`.
3. Tipear email nuevo + password (8+ chars).
4. URL cambia a `/sign-up?status=success`.
5. Status card verde aparece.
6. CTA "Configurar mi ciclo" → `/onboarding`.
7. ✅ Cuenta creada.

### E. Error de passkey cancelado
1. Ir a `/sign-in`.
2. Click "Iniciar sesión con Passkey".
3. Cancelar el prompt del OS.
4. Vuelve a la pantalla de sign-in sin mensaje (USER_CANCELLED no se muestra).
5. ✅ Sin error visible, foco vuelve al botón.

### F. Error de passkey expirado
1. Provocar un challenge viejo. Si no es fácil, saltear.
2. ✅ Esperado: status card `expired-error` con "Reintentar" (futuro: P2 mejora para mostrar el error en la misma pantalla en vez de redirect).

### G. Browser sin passkeys
1. Abrir `/sign-in` en Firefox.
2. Botón "Iniciar sesión con Passkey" deshabilitado con copy "Tu dispositivo no soporta Passkeys".
3. CTA "Usar otro método" sigue siendo el link secundario.
4. ✅ Passkey no ofrecida.

### H. Sesión ya activa (deep link)
1. Logueado, ir manualmente a `/sign-in` (URL pegada en barra).
2. Redirect a `/dashboard` o `/onboarding` según profile.
3. ✅ Nunca ve el form si ya está logueado.
```

- [ ] **Step 7: Verificar typecheck y lint**

Run:
```bash
cd "D:/Proyectos/Apps Web/app-quipu" && pnpm tsc --noEmit && pnpm lint
```
Expected: typecheck sin errores. `pnpm format` si lint reporta issues.

- [ ] **Step 8: Run all vitest**

Run: `cd "D:/Proyectos/Apps Web/app-quipu" && pnpm test`
Expected: PASS para todos los tests del proyecto (los previos de convex + los nuevos de auth).

- [ ] **Step 9: Commit**

```bash
cd "D:/Proyectos/Apps Web/app-quipu"
git add "app/(auth)/layout.tsx" "app/(auth)/sign-in/page.tsx" "app/(auth)/sign-up/page.tsx" "app/(auth)/sign-in/email/page.tsx" "app/(auth)/sign-up/email/page.tsx" docs/auth-smoke.md
git commit -m "feat(auth): add sign-in and sign-up routes with passkey and email/password"
```

---

## Task 8: Remove old sign-in page and clean up

**Files:**
- Delete: `app/(auth)/sign-in/page.tsx` (versión vieja, con la lógica del passkey inline)
- Delete: `auth/passkey.ts` (movido a `modules/auth/passkey.ts`)
- Modify: `app/page.tsx` (borrar demo, dejar `redirect("/sign-in")`)

- [ ] **Step 1: Delete `app/(auth)/sign-in/page.tsx` (versión vieja)**

Run:
```bash
cd "D:/Proyectos/Apps Web/app-quipu" && rm "app/(auth)/sign-in/page.tsx"
```

**Advertencia:** la página vieja y la nueva están en el mismo path (`app/(auth)/sign-in/page.tsx`). El paso 1 de la Task 7 YA REEMPLAZÓ la vieja. Si la nueva ya está commiteada en el commit de la Task 7, este paso es un no-op. **Verificar con `git log --name-only -1` que el último commit tiene `app/(auth)/sign-in/page.tsx` con la nueva versión.** Si sí, skip este paso.

- [ ] **Step 2: Delete `auth/passkey.ts`**

Run:
```bash
cd "D:/Proyectos/Apps Web/app-quipu" && rm auth/passkey.ts
```

- [ ] **Step 3: Update `app/page.tsx`**

Reemplaza el contenido con:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/sign-in");
}
```

- [ ] **Step 4: Verificar typecheck y lint**

Run:
```bash
cd "D:/Proyectos/Apps Web/app-quipu" && pnpm tsc --noEmit && pnpm lint
```
Expected: typecheck sin errores. Si lint se queja, `pnpm format`.

- [ ] **Step 5: Run all vitest**

Run: `cd "D:/Proyectos/Apps Web/app-quipu" && pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd "D:/Proyectos/Apps Web/app-quipu"
git add -A
git status  # verificar que solo se borran los archivos esperados y se modifica app/page.tsx
git commit -m "chore(auth): remove old sign-in page and auth/passkey.ts"
```

---

## Task 9: Update AGENTS.md and CLAUDE.md with auth v2.5 rules

**Files:**
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add rules to `AGENTS.md`**

Insertar una nueva sección **"Reglas de auth (v2.5)"** después de la sección "## Manuales de sistema" y antes de "## Trabajo pendiente":

```markdown
---

## Reglas de auth (v2.5)

- **Auth es un módulo de dominio** (`modules/auth/`), no vive dentro de `app/(auth)/`. El route group `(auth)` es solo wiring de Next.js. Los componentes del dominio auth están en `modules/auth/components/`.
- **Las páginas de auth no usan tabs.** La ruta refleja intención (`sign-in` vs `sign-up`) y método (`passkey` vs `email`). URLs: `/sign-in`, `/sign-up`, `/sign-in/email`, `/sign-up/email`.
- **Validaciones de sesión van en `page.tsx`, no en `layout.tsx`.** Usar `requireUnauthenticatedSession()` (rutas auth) o `requireAuthenticatedSession()` (rutas protegidas) desde `auth/auth-server.ts`.
- **Componentes reusables de status** viven en `shared/components/auth/` (`status-card`, `status-icon`), no en `modules/auth/`. El módulo auth los consume.
- **Errores de Better Auth** se traducen a `ErrorCode` vía `modules/auth/errorMap.ts`. Nunca comparar `error.message` con strings en la UI.

---
```

- [ ] **Step 2: Add the same rules to `CLAUDE.md`**

Insertar la misma sección en el mismo lugar relativo.

- [ ] **Step 3: Verificar formato con Biome**

Run: `cd "D:/Proyectos/Apps Web/app-quipu" && pnpm format`
Expected: formatea los archivos.

- [ ] **Step 4: Commit**

```bash
cd "D:/Proyectos/Apps Web/app-quipu"
git add AGENTS.md CLAUDE.md
git commit -m "docs: add auth v2.5 rules to AGENTS.md and CLAUDE.md"
```

---

## Final Verification

- [ ] **Step 1: Run all vitest**

Run: `cd "D:/Proyectos/Apps Web/app-quipu" && pnpm test`
Expected: PASS para todos los tests.

- [ ] **Step 2: Run typecheck**

Run: `cd "D:/Proyectos/Apps Web/app-quipu" && pnpm tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Run lint**

Run: `cd "D:/Proyectos/Apps Web/app-quipu" && pnpm lint`
Expected: sin warnings nuevos.

- [ ] **Step 4: Smoke test manual (8 casos del Anexo en `docs/auth-smoke.md`)**

- [ ] **Step 5: Push a origin**

```bash
cd "D:/Proyectos/Apps Web/app-quipu"
git push origin chore/quipu-2.0
```

---

## Out of scope (recordatorio)

- Onboarding v2.5 completo (P0-2 del living doc). Solo placeholders de ruta en este plan.
- Dashboard real. Solo placeholder.
- Recovery / forgot password.
- 2FA, magic link, otros métodos.
- Multi-dispositivo: registrar segunda passkey con sesión activa.
- Captura de email en sign-up antes del botón passkey (mejor pendiente: hacer que el form pida email primero, y solo cuando hay email válido muestre el botón). Por ahora, el email está hardcoded como placeholder.
- E2E con Playwright. No hay infraestructura.

# Onboarding móvil OTP + Passkey (wizard 3 pasos) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el registro por enlace en móvil por un wizard (datos+contraseña → OTP → Passkey → éxito) con `emailOTP` de Better Auth, sin cambiar el flujo web.

**Architecture:** El server añade el plugin `emailOTP` (rutas `/email-otp/*` nuevas; sin `overrideDefaultEmailVerification` → la web sigue con enlaces). El móvil verifica con `emailOtp.verifyEmail`, inicia sesión en transparente con `signIn.email` (credenciales en memoria) y registra la Passkey con sesión activa. `sign-up.tsx` se elimina; `create-account.tsx` (wizard con stepper interno) y `sign-in.tsx` (rediseño welcome) lo sustituyen.

**Tech Stack:** Better Auth 1.6.30 (`emailOTP` + `emailOTPClient`, verificados en node_modules) · Expo 57 · TanStack Form + zod · react-native-keyboard-controller · Resend (via `sendOutboundEmail`)

**Spec:** docs/superpowers/specs/2026-09-01-mobile-auth-otp-onboarding-design.md (léelo junto a este plan)

## Global Constraints

- La web NO cambia de flujo: sin `overrideDefaultEmailVerification`; los endpoints `/api/auth/verify-email` (enlace) siguen intactos. Web typecheck + tests deben pasar en cada task de backend.
- Toda cuenta nueva tiene contraseña (paso 1 del wizard). Nada de cuentas sin password.
- La Passkey SOLO se registra con sesión activa (paso 3, después de OTP + signIn).
- Plugin config exacta: `otpLength: 6`, `expiresIn: 600`, `allowedAttempts: 3`, `storeOTP: "hash"`.
- Rate limit nuevo: `"/email-otp/*": { window: 60, max: 3 }` junto a `"/passkey/*"` en `convex/auth.ts`.
- `assertEmailAllowed(email)` dentro de `sendVerificationOTP` (política de dominios existente).
- Iconos: solo funcionales (chevron atrás, checks). Sin app icon, sin Face ID glyph en botones, sin tratamiento de status bar.
- Sin dependencias nuevas (todo ya instalado).
- Plantilla OTP autocontenida en `authTemplates.ts` — NO tocar `authEmailLayout.ts` (requiere CTA con URL; el OTP no lleva link).
- Estilo móvil existente: uniwind classes, fuentes `font-newsreader`/`font-hanken`/`font-hanken-semibold`/`font-geist-mono`, fondo `#FBFAF7`, bordes `#E8E6DF`, error `#B4482F`.

---

### Task 1: Backend — plugin emailOTP + plantilla del código + rate limit

**Files:**
- Modify: `apps/web/convex/lib/email/authTemplates.ts` (añadir `buildOtpEmail` al final)
- Modify: `apps/web/convex/lib/email/authMail.ts` (añadir `sendOtpEmail`)
- Test: `apps/web/convex/lib/email/authTemplates.test.ts` (añadir casos de `buildOtpEmail`)
- Modify: `apps/web/convex/auth.ts` (plugin + rate limit)

**Interfaces:**
- Consumes: `sendOutboundEmail({ to, subject, html, text })` y `isDevelopmentDeployment()` (existentes en `convex/lib/email/`), `assertEmailAllowed(email)` (existente, importado ya en `auth.ts`).
- Produces: `sendOtpEmail(params: { to: string; otp: string; name?: string | null }): Promise<void>` — lo consume `sendVerificationOTP` en `auth.ts`.

- [ ] **Step 1: Test que falla — `buildOtpEmail`**

Añadir al final de `apps/web/convex/lib/email/authTemplates.test.ts` (leer el archivo primero y seguir su estilo de imports/describe):

```ts
describe("buildOtpEmail", () => {
  it("incluye el código de 6 dígitos en texto y asunto", () => {
    const email = buildOtpEmail({ code: "482913" });
    expect(email.text).toContain("482913");
    expect(email.subject).toContain("482913");
  });

  it("incluye el código en el html y caducidad de 10 minutos", () => {
    const email = buildOtpEmail({ code: "482913" });
    expect(email.html).toContain("482913");
    expect(email.text).toContain("10 minutos");
  });

  it("incluye saludo cuando hay nombre", () => {
    const email = buildOtpEmail({ code: "482913", name: "Edzon" });
    expect(email.text).toContain("Hola, Edzon");
  });
});
```

Ajustar el import del test: `buildOtpEmail` se añade al import existente de `./authTemplates`.

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `pnpm --filter @quipu/web exec vitest run convex/lib/email/authTemplates.test.ts`
Expected: FAIL — `buildOtpEmail` no existe.

- [ ] **Step 3: Implementar `buildOtpEmail` en `authTemplates.ts`**

Añadir al final de `apps/web/convex/lib/email/authTemplates.ts` (autocontenida, sin `renderAuthEmailHtml` porque ese layout exige CTA con URL y el OTP no lleva link):

```ts
type OtpEmailBuildInput = {
  code: string;
  name?: string;
};

const OTP_EMAIL_STYLES = {
  body: 'margin:0;padding:32px 24px;background:#FBFAF7;font-family:Georgia,serif;color:#1A1A1A;',
  card: 'max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid #E8E6DF;border-radius:12px;padding:32px;',
  code: 'display:inline-block;margin:16px 0;padding:12px 24px;border:1px solid #E8E6DF;border-radius:8px;font-family:monospace;font-size:32px;letter-spacing:12px;color:#1A1A1A;',
  paragraph: 'margin:0 0 12px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#1A1A1A;',
  muted: 'margin:16px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#9A968C;',
};

export function buildOtpEmail(input: OtpEmailBuildInput): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = input.name?.trim() ? `Hola, ${input.name.trim()}` : undefined;
  const paragraphs = [
    "Tu código para confirmar tu correo en Quipu es:",
  ];

  const html = `<!DOCTYPE html>
<html><body style="${OTP_EMAIL_STYLES.body}">
  <div style="${OTP_EMAIL_STYLES.card}">
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;font-weight:400;">Confirma tu correo</h1>
    ${greeting ? `<p style="${OTP_EMAIL_STYLES.paragraph}">${greeting}</p>` : ""}
    ${paragraphs.map((p) => `<p style="${OTP_EMAIL_STYLES.paragraph}">${p}</p>`).join("\n    ")}
    <div style="${OTP_EMAIL_STYLES.code}">${input.code}</div>
    <p style="${OTP_EMAIL_STYLES.paragraph}">El código caduca en 10 minutos.</p>
    <p style="${OTP_EMAIL_STYLES.muted}">Si no creaste una cuenta en Quipu, puedes ignorar este correo.</p>
  </div>
</body></html>`;

  const text = [
    "Confirma tu correo",
    ...(greeting ? [greeting, ""] : []),
    ...paragraphs.map((p) => `${p}\n`),
    input.code,
    "",
    "El código caduca en 10 minutos.",
    "",
    "Si no creaste una cuenta en Quipu, puedes ignorar este correo.",
  ].join("\n");

  return {
    subject: `Tu código de Quipu: ${input.code}`,
    html,
    text,
  };
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `pnpm --filter @quipu/web exec vitest run convex/lib/email/authTemplates.test.ts`
Expected: PASS (todos los casos, incluidos los pre-existentes).

- [ ] **Step 5: Implementar `sendOtpEmail` en `authMail.ts`**

Añadir al final de `apps/web/convex/lib/email/authMail.ts` (mismo patrón dev/prod que `deliverAuthEmail`):

```ts
type OtpEmailRecipient = {
  to: string;
  otp: string;
  name?: string | null;
};

function logOtpEmailToConsole(params: OtpEmailRecipient): void {
  console.log(
    `[Quipu dev] Código OTP (verificación de correo) — Resend desactivado.\n` +
      `  to: ${params.to}\n` +
      `  code: ${params.otp}`,
  );
}

export async function sendOtpEmail(params: OtpEmailRecipient): Promise<void> {
  if (isDevelopmentDeployment()) {
    logOtpEmailToConsole(params);
    return;
  }

  const { subject, html, text } = buildOtpEmail({
    code: params.otp,
    name: params.name ?? undefined,
  });

  await sendOutboundEmail({
    to: params.to,
    subject,
    html,
    text,
  });
}
```

Importar `buildOtpEmail` en el import existente de `./authTemplates`.

- [ ] **Step 6: Plugin `emailOTP` + rate limit en `convex/auth.ts`**

En `apps/web/convex/auth.ts`:

1. Añadir al bloque de imports de plugins (junto a `import { convex } from "@convex-dev/better-auth/plugins"`):

```ts
import { emailOTP } from "better-auth/plugins";
```

2. Importar el helper:

```ts
import { sendOtpEmail } from "./lib/email/authMail";
```

3. En `createAuthOptions`, dentro de `rateLimit.customRules`, añadir junto a `"/passkey/*"`:

```ts
        "/email-otp/*": { window: 60, max: 3 },
```

4. En el array `plugins`, después del plugin `passkey({...})`, añadir:

```ts
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        allowedAttempts: 3,
        storeOTP: "hash",
        sendVerificationOTP: async ({ email, otp }) => {
          assertEmailAllowed(email);
          await sendOtpEmail({ to: email, otp });
        },
      }),
```

- [ ] **Step 7: Verificación backend completa**

```bash
pnpm --filter @quipu/web typecheck
pnpm --filter @quipu/web test -- --run
pnpm --filter @quipu/web lint
```

Expected: todo PASS. La web no cambia de comportamiento (plugin solo añade rutas `/email-otp/*` que la web no consume).

- [ ] **Step 8: Commit**

```bash
git add apps/web/convex/lib/email/authTemplates.ts apps/web/convex/lib/email/authTemplates.test.ts apps/web/convex/lib/email/authMail.ts apps/web/convex/auth.ts
git commit -m "feat(web): emailOTP plugin + OTP email template (mobile verification)"
```

---

### Task 2: Móvil — `emailOTPClient` en el auth client

**Files:**
- Modify: `apps/mobile/lib/auth-client.ts`

**Interfaces:**
- Produces: `authClient.emailOtp.sendVerificationOtp({ email, type })` y `authClient.emailOtp.verifyEmail({ email, otp })` disponibles para el wizard (Task 3).

- [ ] **Step 1: Añadir el plugin**

En `apps/mobile/lib/auth-client.ts`:

```ts
import { emailOTPClient } from "better-auth/client/plugins";
```

Añadir `emailOTPClient(),` al array de `plugins` (junto a `convexClient()`).

- [ ] **Step 2: Verificar**

```bash
pnpm --filter @quipu/mobile typecheck
```

Expected: PASS (los métodos `authClient.emailOtp.*` quedan tipados).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/lib/auth-client.ts
git commit -m "feat(mobile): add emailOTPClient plugin"
```

---

### Task 3: Móvil — Wizard `(auth)/create-account.tsx` + eliminar `sign-up.tsx`

**Files:**
- Create: `apps/mobile/app/(auth)/create-account.tsx`
- Modify: `apps/mobile/app/(auth)/_layout.tsx` (registrar la ruta)
- Delete: `apps/mobile/app/(auth)/sign-up.tsx`

**Interfaces:**
- Consumes: `authClient` (signUp.email, emailOtp.sendVerificationOtp/verifyEmail, signIn.email, passkey.addPasskey), `FieldError` de `@/shared/components/auth/field-error`, `KeyboardAvoidingView` de `react-native-keyboard-controller`.
- Produces: ruta `/create-account`. El wizard guarda `email`/`password` en estado React (para el signIn transparente del paso 2→3).

Patrones obligatorios (ya validados en esta rama): formularios con `useForm` + schema zod con `validators: { onBlur: schema, onSubmit: schema }` y listener `onChange` que llama `fieldApi.validate("blur")` cuando `isBlurred || errors.length > 0`; errores de server con `formApi.setErrorMap({ onSubmit: { form: msg, fields: {} } })` y render vía `form.Subscribe` con cast `{ form?: string }`; submit con `form.Subscribe([canSubmit, isSubmitting])`; campos envueltos en `KeyboardAvoidingView behavior="padding"`.

- [ ] **Step 1: Registrar la ruta en `(auth)/_layout.tsx`**

Dentro del `Stack` de `apps/mobile/app/(auth)/_layout.tsx`, junto a `sign-in`:

```tsx
      <Stack.Screen name="create-account" options={{ animation: "fade" }} />
```

- [ ] **Step 2: Crear `apps/mobile/app/(auth)/create-account.tsx`**

Estructura completa (implementar con los patrones citados; los textos son literales del diseño aprobado):

```tsx
import { useForm } from "@tanstack/react-form";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  KeyboardAvoidingView,
  KeyboardToolbar,
} from "react-native-keyboard-controller";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import FieldError from "@/shared/components/auth/field-error";

type Step = 1 | 2 | 3 | 4;

const accountSchema = z.object({
  name: z.string().trim().min(1, "Dinos cómo te llamas"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "El email es obligatorio")
    .pipe(z.email("Email inválido")),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Ingresa los 6 dígitos"),
});
```

Estado del componente: `step` (Step), `account` (`{ name, email, password } | null`), `otp` (string, 6 dígitos), `otpError` (string | null), `otpLoading`, `resendIn` (number, segundos; arranca en 60), `passkeyDone` (boolean | null — null = pendiente/skip), `passkeyLoading`.

**Paso 1 — datos** (form TanStack con `accountSchema`): campos Nombre (autoCapitalize words), Email, Contraseña (secureTextEntry). Botón "Continuar" (solo texto). `onSubmit`:

```tsx
onSubmit: async ({ value, formApi }) => {
  const { error } = await authClient.signUp.email({
    email: value.email,
    password: value.password,
    name: value.name,
  });
  if (error) {
    formApi.setErrorMap({
      onSubmit: { form: error.message ?? "No se pudo crear la cuenta", fields: {} },
    });
    return;
  }
  setAccount(value);
  setStep(2);
},
```

**Transición 1→2:** al entrar al paso 2, enviar el OTP una vez (ver Step 3).

**Paso 2 — OTP:** cabecera centrada mono caps `CREAR CUENTA · 02/03`, barra de progreso (2 de 3 segmentos en `#1A1A1A`, resto `#E8E6DF`), titular Newsreader "Confirma tu correo.", subtexto "Te enviamos un código de 6 dígitos a" + email en semibold. Input: UN `TextInput` de 6 dígitos (`keyboardType="numeric"`, `maxLength={6}`, `textAlign="center"`, tracking visual con `letterSpacing: 12`) encima de 6 cajas decorativas (`View` de 48x56 con borde `#E8E6DF`, radio 8; el input es opaco-0 posicionado sobre ellas; el dígito activo lleva borde `#1A1A1A`). Debajo: fila "¿No te llegó?" + `REENVIAR EN 0:SS` mono caps (o `REENVIAR` presionable cuando `resendIn === 0`). Botón "Verificar" (deshabilitado si otp.length < 6 u otpLoading) y nota en caja gris: "También puedes abrir el enlace del correo desde este teléfono; Quipu continúa solo." (el enlace sigue siendo válido — se mantiene por si el usuario lo prefiere).

Lógica del paso 2:

```tsx
const sendOtp = useCallback(async () => {
  if (!account) return;
  setOtpLoading(true);
  const { error } = await authClient.emailOtp.sendVerificationOtp({
    email: account.email,
    type: "email-verification",
  });
  setOtpLoading(false);
  if (error) {
    setOtpError(error.message ?? "No se pudo enviar el código");
    return;
  }
  setResendIn(60);
}, [account]);

useEffect(() => {
  if (step === 2 && resendIn === 60) void sendOtp();
}, [step, resendIn, sendOtp]);

useEffect(() => {
  if (resendIn <= 0) return;
  const t = setInterval(() => setResendIn((s) => s - 1), 1000);
  return () => clearInterval(t);
}, [resendIn]);
```

Verificar:

```tsx
const verifyOtp = async () => {
  if (!account || otp.length !== 6) return;
  setOtpLoading(true);
  setOtpError(null);
  const { error } = await authClient.emailOtp.verifyEmail({
    email: account.email,
    otp,
  });
  if (error) {
    setOtpLoading(false);
    setOtpError(
      error.status === 429
        ? "Demasiados intentos. Pide un código nuevo."
        : "Código incorrecto o expirado",
    );
    return;
  }
  // Sesión transparente con las credenciales en memoria
  const signIn = await authClient.signIn.email({
    email: account.email,
    password: account.password,
  });
  setOtpLoading(false);
  if (signIn.error) {
    setOtpError(
      "Correo verificado. Inicia sesión para continuar.",
    );
    router.replace("/sign-in");
    return;
  }
  setStep(3);
};
```

Nota: si Better Auth devuelve `TOO_MANY_ATTEMPTS` con status distinto de 429, ajustar el mapping al constante real (ver `error.message`); el texto final es el mismo.

**Paso 3 — Passkey:** cabecera `CREAR CUENTA · 03/03` (3 segmentos llenos), titular "Tu teléfono será tu llave.", lista con checks (✓ en `Text` de color `#1A1A1A`, sin iconos externos):
- "La llave nunca sale de tu teléfono"
- "Se sincroniza cifrada con tu cuenta de Apple o Google"
- "Puedes agregar otra en cualquier momento"

Botones: primario "Crear mi Passkey" →

```tsx
const createPasskey = async () => {
  setPasskeyLoading(true);
  const { error } = await authClient.passkey.addPasskey({ name: account?.email });
  setPasskeyLoading(false);
  setPasskeyDone(!error);
  setStep(4);
};
```

Secundario "Continuar sin Passkey" → `setPasskeyDone(false); setStep(4);`
Si `addPasskey` falla por entorno (Expo Go sin módulos nativos), el flujo NO se rompe: cae en éxito con "pendiente".

**Paso 4 — Éxito:** cabecera mono caps `CUENTA LISTA`, círculo de check (`View` 56x56 radio completo fondo `#E8E6DF` con `✓` centrado — sin icono externo), titular "Ya puedes entrar con tu llave.", filas del resumen (label Hanken izquierda / valor semibold derecha + ✓):
- "Passkey" → `passkeyDone ? "Creada ✓" : "Pendiente"`
- "Correo" → "Verificado ✓"
- "Respaldo" → "Contraseña definida ✓"

Primario "Configurar mi sistema" → `router.replace("/(tabs)")` (placeholder hasta el onboarding financiero). Sin botón secundario.

**Back:** chevron `←` (carácter de texto `‹` en un `Pressable`, SIN icono externo) arriba a la izquierda en pasos 2-3: paso>1 → `setStep(step-1)`; en paso 1 → `router.back()`. En paso 4 no hay back.

- [ ] **Step 3: Eliminar `apps/mobile/app/(auth)/sign-up.tsx`**

```bash
git rm "apps/mobile/app/(auth)/sign-up.tsx"
```

- [ ] **Step 4: Actualizar el enlace en `sign-in.tsx`**

En `apps/mobile/app/(auth)/sign-in.tsx`, cambiar `router.push("/sign-up")` por `router.push("/create-account")` (y el texto "Crear cuenta" se mantiene).

- [ ] **Step 5: Typecheck + lint**

```bash
pnpm --filter @quipu/mobile typecheck
pnpm exec biome check --write "apps/mobile/app/(auth)/create-account.tsx" "apps/mobile/app/(auth)/_layout.tsx" "apps/mobile/app/(auth)/sign-in.tsx"
```

Expected: PASS / sin errores.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app
git commit -m "feat(mobile): signup wizard (data → OTP → passkey) replacing sign-up"
```

---

### Task 4: Móvil — Rediseño `sign-in.tsx` (welcome según mockup)

**Files:**
- Modify: `apps/mobile/app/(auth)/sign-in.tsx`

**Interfaces:**
- Consumes: todo lo existente del screen (authClient, form TanStack, KeyboardAvoidingView).
- Produces: mismo comportamiento de auth, nueva vista welcome + vista email alternada con `useState<"welcome" | "email">`.

- [ ] **Step 1: Reestructurar el JSX**

Estado nuevo: `const [view, setView] = useState<"welcome" | "email">("welcome");`

**Vista welcome** (cuando `view === "welcome"`):
- Titular Newsreader 28: "Divide tu dinero antes de gastarlo."
- Subtítulo Hanken 14 `text-foreground/55`: "Entra con la seguridad de tu propio teléfono. Sin contraseñas que recordar."
- Primario: "Continuar con Passkey" → `void signInWithPasskey()` (reusa el handler existente).
- Debajo, mono caps 10.5 `text-foreground/45` centrado: `FACE ID · TOUCH ID · CÓDIGO DEL TELÉFONO`
- Divisor con texto `O BIEN` (mismo patrón del divider actual, texto "O BIEN").
- Secundario (borde): "Entrar con correo" → `setView("email")`.
- Link inferior: "¿Nuevo en Quipu? " + "Crear cuenta" (semibold) → `router.push("/create-account")`.

**Vista email** (cuando `view === "email"`): el formulario email+password actual SIN CAMBIOS de lógica (form, validaciones, listener de revalidación, error de server, Subscribe de submit), con el título cambiado a "Entra a tu cuenta." y un botón/link de vuelta `‹` arriba que hace `setView("welcome")`. El botón de passkey NO se duplica en esta vista (ya está en welcome).

- [ ] **Step 2: Typecheck + lint**

```bash
pnpm --filter @quipu/mobile typecheck
pnpm exec biome check --write "apps/mobile/app/(auth)/sign-in.tsx"
```

- [ ] **Step 3: Commit**

```bash
git add "apps/mobile/app/(auth)/sign-in.tsx"
git commit -m "feat(mobile): sign-in welcome redesign per mockup"
```

---

### Task 5: Verificación end-to-end

**Files:** ninguno. Requiere `pnpm --filter @quipu/web convex:dev` corriendo (el código OTP aparece en la consola de Convex en dev, vía `logOtpEmailToConsole`) y development build del móvil (passkey del paso 3).

- [ ] **Step 1: Backend en marcha + web intacta**

```bash
pnpm --filter @quipu/web typecheck
pnpm --filter @quipu/web test -- --run
```

Smoke web (no debe cambiar): login con passkey, login email+password, registro web con enlace.

- [ ] **Step 2: Flujo móvil completo (Caso A)**

Wizard: datos (nombre/email/password) → llega OTP (consola de Convex en dev) → ingresar código → sin re-escribir nada, sesión activa (el wizard pasa al paso 3) → crear passkey (o continuar sin) → éxito → tabs.

- [ ] **Step 3: Casos de error del OTP**

Código mal → "Código incorrecto o expirado"; 3 intentos → pedir nuevo; reenvío antes de 60s deshabilitado; a los 60s aparece "REENVIAR" y llega otro código.

- [ ] **Step 4: Casos B–F heredados**

Sign-in passkey (usuario existente), sign-in email+password (usuario web existente), restauración de sesión, logout, queries autenticadas.

- [ ] **Step 5: Regresión de rutas**

`/sign-up` ya no existe: ningún link roto (`grep -r "sign-up" apps/mobile/app`). El wizard entra desde "Crear cuenta" en sign-in.

- [ ] **Step 6: Commit final (si hay ajustes)** y reporte

```bash
git add -A apps/mobile apps/web
git commit -m "chore(mobile): otp onboarding verification fixes"
```
